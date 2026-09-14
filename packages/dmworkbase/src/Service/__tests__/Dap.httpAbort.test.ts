import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * http_request 原始事件已按 Option A 停发(前端不再上报「HTTP 请求」这条原始埋点,只保留
 * 2xx 命中的 mapped 业务事件)。fetch/XHR 包裹里的取消判定(isAbortError / XHR abort 标记)
 * 依旧保留 —— 它挡的是「被取消的在途请求不该被当成一次完成的请求处理」,但取消 / 失败本就落不到
 * 2xx,不再有任何 telemetry 产出。
 *
 * 本文件作为回归护栏,盯两组仍存活的路径:
 *   (A) 三种收尾(2xx 完成 / 用户取消 / 真实网络失败)都**不得**再产出原始 http_request。
 *   (B) **XHR 完成 loadend 仍会走 emit() 补发 2xx 映射事件**(path 通道 / body 通道),
 *       且被取消的 XHR(即便 status 落在 2xx)不得补发 —— 这正是本 PR 编辑到、但一度被
 *       误删测试守护的 XHR 上报路径(installHttpWrap 的 onLoadEnd → emit)。删掉该 emit,
 *       或删掉 `!aborted` 门,下面的断言即变红(delete-the-fix)。
 * 单独成文件:vitest 默认按文件隔离(全新 jsdom)。
 */

const BATCH_PATH = '/v1/e/b'
type FetchMock = ReturnType<typeof vi.fn>

async function freshTracker() {
    vi.resetModules()
    return import('../Dap')
}

function httpEvents(fetchMock: FetchMock): Array<{ props?: Record<string, unknown> }> {
    const out: Array<{ props?: Record<string, unknown> }> = []
    for (const c of fetchMock.mock.calls) {
        if (c[0] !== BATCH_PATH) continue
        const body = JSON.parse((c[1] as RequestInit).body as string)
        for (const e of body.events as Array<{ event_name: string; props?: Record<string, unknown> }>) {
            if (e.event_name === 'http_request') out.push(e)
        }
    }
    return out
}

/** 上报批次里的全部事件名(跨所有 /v1/e/b 批次)。 */
function batchEventNames(fetchMock: FetchMock): string[] {
    const names: string[] = []
    for (const c of fetchMock.mock.calls) {
        if (c[0] !== BATCH_PATH) continue
        const body = JSON.parse((c[1] as RequestInit).body as string)
        for (const e of body.events as Array<{ event_name: string }>) names.push(e.event_name)
    }
    return names
}

/**
 * 驱动一个 XHR 走完 open→send→(abort?)→loadend 的收尾。
 * jsdom 无真实响应:status 由测试显式钉住(shadow 掉原型 getter),loadend 手动派发,
 * 这与 wrapper「在 loadend 里读 this.status 决定是否补发映射」的真实路径完全一致。
 */
function driveXhr(
    method: string,
    url: string,
    opts: { status?: number; body?: string; abort?: boolean } = {},
): void {
    const x = new XMLHttpRequest()
    x.open(method, url)
    try {
        x.send(opts.body)
    } catch {
        /* jsdom 对无真实网络的 send 可能抛,不影响 wrapper 已挂好的监听 */
    }
    if (typeof opts.status === 'number') {
        Object.defineProperty(x, 'status', { value: opts.status, configurable: true })
    }
    // abort 必须先于 loadend 触发(与浏览器一致),wrapper 借此标记跳过。
    if (opts.abort) x.dispatchEvent(new Event('abort'))
    x.dispatchEvent(new Event('loadend'))
}

describe('Dap — 完成 / 取消 / 失败都不再产 http_request(Option A)', () => {
    beforeEach(() => {
        localStorage.clear()
        document.body.innerHTML = ''
    })
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('fetch: 2xx / AbortError / 真实网络失败三种收尾都不产 http_request', async () => {
        const origin = location.origin
        // 上报通道恒 ok;/aborted 抛 AbortError(取消);/boom 抛普通错误(真实失败)
        const fetchMock: FetchMock = vi.fn((url: string) => {
            if (String(url).indexOf(BATCH_PATH) !== -1) return Promise.resolve({ ok: true, status: 200 } as Response)
            if (String(url).indexOf('/aborted') !== -1) {
                const e = new Error('aborted')
                e.name = 'AbortError'
                return Promise.reject(e)
            }
            if (String(url).indexOf('/boom') !== -1) return Promise.reject(new TypeError('network down'))
            return Promise.resolve({ ok: true, status: 200 } as Response)
        })
        // @ts-expect-error test stub
        globalThis.fetch = fetchMock

        const { Dap } = await freshTracker()
        Dap.shared.setEnabled(true)
        Dap.shared.init()

        await globalThis.fetch(`${origin}/api/search`).catch(() => {}) // 正常 200 → 2xx
        await globalThis.fetch(`${origin}/api/search/aborted`).catch(() => {}) // 取消
        await globalThis.fetch(`${origin}/api/search/boom`).catch(() => {}) // 真实失败
        Dap.shared.flush()
        await Promise.resolve()

        // Option A:三种收尾都不再产出原始 http_request
        expect(httpEvents(fetchMock)).toHaveLength(0)
    })

    it('XHR: 完成 loadend 与取消都不产 http_request', async () => {
        const origin = location.origin
        const fetchMock: FetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 } as Response))
        // @ts-expect-error test stub
        globalThis.fetch = fetchMock

        const { Dap } = await freshTracker()
        Dap.shared.setEnabled(true)
        Dap.shared.init()

        // 取消:abort 先于 loadend 触发 → wrapper 标记后 loadend 跳过
        driveXhr('GET', `${origin}/api/search/aborted`, { abort: true })
        // 完成:只走 loadend(无 abort)
        driveXhr('GET', `${origin}/api/other`, { status: 200 })

        Dap.shared.flush()
        await Promise.resolve()

        expect(httpEvents(fetchMock)).toHaveLength(0)
    })
})

describe('Dap — XHR loadend 仍走 emit 补发 2xx 映射事件(护栏:PR 编辑到的上报路径)', () => {
    let fetchMock: FetchMock
    beforeEach(() => {
        localStorage.clear()
        document.body.innerHTML = ''
        fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 } as Response))
        // @ts-expect-error test stub
        globalThis.fetch = fetchMock
    })
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('XHR: 2xx 命中 path 规则 → 补发映射事件(POST /api/v1/user/login → user_login)', async () => {
        const { Dap } = await freshTracker()
        Dap.shared.setEnabled(true)
        Dap.shared.init()

        // 走 XHR(非 fetch)完成一条命中 FETCH_RULES 的 2xx 请求:
        // onLoadEnd → emit(status=200) → path 通道 matchFetchEvent → track('user_login')。
        driveXhr('POST', `${location.origin}/api/v1/user/login`, { status: 200 })
        Dap.shared.flush()
        await Promise.resolve()

        const names = batchEventNames(fetchMock)
        expect(names).toContain('user_login') // 删掉 onLoadEnd 的 emit,这里立即变红
        expect(names).not.toContain('http_request') // 原始事件仍不产
    })

    it('XHR: 2xx 命中 body 规则 → 补发映射事件(PUT /groups/:id/setting {save:1} → conversation_saved_to_contacts)', async () => {
        const { Dap } = await freshTracker()
        Dap.shared.setEnabled(true)
        Dap.shared.init()

        // XHR body 通道:send 的字符串体在包裹处算出 bodyEvent,loadend(2xx)时经 emit 补发。
        driveXhr('PUT', `${location.origin}/api/v1/groups/g1/setting`, {
            status: 200,
            body: JSON.stringify({ save: 1, remark_secret: 'do-not-leak' }),
        })
        Dap.shared.flush()
        await Promise.resolve()

        const names = batchEventNames(fetchMock)
        expect(names).toContain('conversation_saved_to_contacts')
        expect(names).not.toContain('http_request')
        // 体里的任何值都不得随映射事件外泄
        const batchCall = fetchMock.mock.calls.find((c) => c[0] === BATCH_PATH)
        expect(JSON.stringify(batchCall![1]).includes('do-not-leak')).toBe(false)
    })

    it('XHR: 被取消(即便 status 落在 2xx)不补发映射事件(护栏 !aborted 门)', async () => {
        const { Dap } = await freshTracker()
        Dap.shared.setEnabled(true)
        Dap.shared.init()

        // 先产一条业务事件,保证有上报批次 —— 使「映射事件缺席」是真缺席,而非「压根没批次」。
        Dap.shared.track('_probe', {})
        // 命中 path 规则、status 200,但先 abort 再 loadend:wrapper 应标记跳过,不补发 user_login。
        driveXhr('POST', `${location.origin}/api/v1/user/login`, { status: 200, abort: true })
        Dap.shared.flush()
        await Promise.resolve()

        const names = batchEventNames(fetchMock)
        expect(names).toContain('_probe') // 批次确实发了
        expect(names).not.toContain('user_login') // 取消的请求不补发;删 `!aborted` 门这里变红
    })
})
