import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * http_request 原始事件已按 Option A 停发(前端不再上报「HTTP 请求」这条原始埋点,只保留
 * 2xx 命中的 mapped 业务事件)。fetch/XHR 包裹里的取消判定(isAbortError / XHR abort 标记)
 * 依旧保留 —— 它挡的是「被取消的在途请求不该被当成一次完成的请求处理」,但取消 / 失败本就落不到
 * 2xx,不再有任何 telemetry 产出。
 *
 * 本文件作为回归护栏:2xx 完成 / 用户取消 / 真实网络失败三种收尾都**不得**再产出 http_request。
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
        const aborted = new XMLHttpRequest()
        aborted.open('GET', `${origin}/api/search/aborted`)
        aborted.send()
        aborted.dispatchEvent(new Event('abort'))
        aborted.dispatchEvent(new Event('loadend'))

        // 完成:只走 loadend(无 abort)
        const done = new XMLHttpRequest()
        done.open('GET', `${origin}/api/other`)
        done.send()
        done.dispatchEvent(new Event('loadend'))

        Dap.shared.flush()
        await Promise.resolve()

        expect(httpEvents(fetchMock)).toHaveLength(0)
    })
})
