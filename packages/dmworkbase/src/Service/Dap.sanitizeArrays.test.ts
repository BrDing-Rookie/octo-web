// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dap } from './Dap'

/**
 * DAP-413 回归:sanitizeProps 放行「基础量数组」,让 batch 事件能把 item_ids 送成**真 JSON 数组**。
 *
 * 验收核心(架构裁定 5 / 本单 brief 第 2 点):断言必须打到 envelope() → JSON.stringify 之后的
 * POST body 形态——mock fetch 抓 body、JSON.parse 回来断言 `Array.isArray`,而非只测 sanitizeProps
 * 的返回值。下游 octo-dap `JSON_TABLE(object_json, '$.item_ids[*]')` 需要真数组([1,2,3]),
 * 字符串("[1,2,3]" / "1,2,3")都展不开。
 */

const shared = Dap.shared

// 抓 track 上报的 POST body:mock globalThis.fetch,把 body JSON.parse 回来供断言。
// 返回**每条事件**的 props(而非 sanitizeProps 返回值),锁「真数组」在序列化后仍成立。
function captureEvents(fn: () => void): Array<{ event_name: string; props?: Record<string, unknown> }> {
    const bodies: string[] = []
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
        if (init && typeof init.body === 'string') bodies.push(init.body)
        // resolve ok:避免走重试路径
        return Promise.resolve({ ok: true, status: 200 } as Response)
    })
    const g = globalThis as unknown as { fetch: typeof fetch }
    const prev = g.fetch
    g.fetch = fetchMock as unknown as typeof fetch
    try {
        fn()
        shared.flush() // 强制把队列 POST 出去(FLUSH_SIZE 未满也发)
    } finally {
        g.fetch = prev
    }
    const events: Array<{ event_name: string; props?: Record<string, unknown> }> = []
    for (const raw of bodies) {
        const parsed = JSON.parse(raw) as { events: Array<{ event_name: string; props?: Record<string, unknown> }> }
        for (const e of parsed.events) events.push(e)
    }
    return events
}

// 从抓到的事件里取指定 event_name 的 props(取最后一条,避开 app_launched 等前置事件)。
function propsOf(
    events: Array<{ event_name: string; props?: Record<string, unknown> }>,
    eventName: string,
): Record<string, unknown> | undefined {
    const hit = events.filter((e) => e.event_name === eventName)
    return hit.length ? hit[hit.length - 1].props : undefined
}

describe('Dap.sanitizeProps 基础量数组放行(DAP-413)', () => {
    beforeEach(() => {
        // jsdom 默认 location 为 http://localhost/,isSupportedRuntime() 成立。
        // 每例先关再开:清空队列/代次,拿到干净的启用态。setTokenProvider 让 app_launched 能补发,
        // 但对本单断言无影响(我们只看指定 batch 事件的 props)。
        shared.setEnabled(false)
        shared.setTokenProvider(() => 'test-token')
        shared.setEnabled(true)
    })

    afterEach(() => {
        shared.setEnabled(false)
        vi.restoreAllMocks()
    })

    it('number[] 原样保留为真 JSON 数组(端到端 POST body 断言,非字符串)', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_downloaded', { item_ids: [1, 2, 3], count: 3 })
        })
        const props = propsOf(events, 'drive_file_batch_downloaded')
        expect(props).toBeDefined()
        // 核心:序列化 → 反序列化后仍是数组,而不是 "[1,2,3]" / "1,2,3" 字符串
        expect(Array.isArray(props!.item_ids)).toBe(true)
        expect(props!.item_ids).toEqual([1, 2, 3])
        expect(typeof props!.item_ids).not.toBe('string')
        // 标量并存不受影响
        expect(props!.count).toBe(3)
    })

    it('string[] 原样保留为真 JSON 数组(端到端 POST body 断言,非字符串)', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_moved', { item_ids: ['a', 'b', 'c'] })
        })
        const props = propsOf(events, 'drive_file_batch_moved')
        expect(props).toBeDefined()
        expect(Array.isArray(props!.item_ids)).toBe(true)
        expect(props!.item_ids).toEqual(['a', 'b', 'c'])
        expect(typeof props!.item_ids).not.toBe('string')
    })

    it('含对象元素的数组 → 整个 key 被丢弃(不部分保留、不序列化正文)', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_deleted', {
                item_ids: [{ id: 1, name: 'secret.doc' }, { id: 2 }],
                count: 2,
            })
        })
        const props = propsOf(events, 'drive_file_batch_deleted')
        expect(props).toBeDefined()
        expect('item_ids' in props!).toBe(false) // 整体丢弃
        expect(props!.count).toBe(2) // 其余标量保留
    })

    it('嵌套数组元素 → 整个 key 被丢弃', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_moved', { item_ids: [[1, 2], [3, 4]], count: 2 })
        })
        const props = propsOf(events, 'drive_file_batch_moved')
        expect(props).toBeDefined()
        expect('item_ids' in props!).toBe(false)
        expect(props!.count).toBe(2) // 其余标量仍在,证明只丢了坏 key
    })

    it('混合类型数组(number + string) → 整个 key 被丢弃', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_moved', { item_ids: [1, 'two', 3], count: 3 })
        })
        const props = propsOf(events, 'drive_file_batch_moved')
        expect(props).toBeDefined()
        expect('item_ids' in props!).toBe(false)
        expect(props!.count).toBe(3)
    })

    it('超长数组被截断到 MAX_ARRAY_LEN(200),且不抛错', () => {
        const big = Array.from({ length: 1000 }, (_, i) => i)
        const events = captureEvents(() => {
            shared.track('drive_file_batch_downloaded', { item_ids: big })
        })
        const props = propsOf(events, 'drive_file_batch_downloaded')
        expect(props).toBeDefined()
        expect(Array.isArray(props!.item_ids)).toBe(true)
        expect((props!.item_ids as number[]).length).toBe(200)
        expect((props!.item_ids as number[])[0]).toBe(0)
        expect((props!.item_ids as number[])[199]).toBe(199)
    })

    it('黑名单 key 即使值是数组也照旧被丢(合规:数组不得绕过黑名单)', () => {
        const events = captureEvents(() => {
            // content 命中 PROP_KEY_BLACKLIST /(text|content|body|keyword|query|token|secret|password|phone|email)/i
            shared.track('drive_file_batch_moved', {
                content_ids: ['正文1', '正文2'],
                item_ids: [1, 2],
            })
        })
        const props = propsOf(events, 'drive_file_batch_moved')
        expect(props).toBeDefined()
        expect('content_ids' in props!).toBe(false) // 黑名单命中,丢
        expect(Array.isArray(props!.item_ids)).toBe(true) // 白名单数组照常放行
        expect(props!.item_ids).toEqual([1, 2])
    })

    it('空数组 [] 显式与「缺失」等价地丢弃(不变 null、不混进 props)', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_deleted', { item_ids: [], count: 0 })
        })
        const props = propsOf(events, 'drive_file_batch_deleted')
        expect(props).toBeDefined()
        expect('item_ids' in props!).toBe(false) // 空数组丢弃
        expect(props!.item_ids).toBeUndefined()
        expect(props!.count).toBe(0)
    })

    it('含 null / boolean / undefined 元素的数组 → 整个 key 丢弃', () => {
        const events = captureEvents(() => {
            shared.track('drive_file_batch_moved', {
                a: [1, null, 3],
                b: [true, false],
                c: [1, undefined],
                count: 1,
            })
        })
        const props = propsOf(events, 'drive_file_batch_moved')
        expect(props).toBeDefined()
        expect('a' in props!).toBe(false)
        expect('b' in props!).toBe(false)
        expect('c' in props!).toBe(false)
        expect(props!.count).toBe(1)
    })
})
