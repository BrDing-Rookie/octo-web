import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('emits workspace_created once per successful same-origin creation, not failures, lists or cross-origin', async () => {
    localStorage.clear()
    const send = vi.fn(async (url: string) => {
        if (String(url).includes('/v1/e/b')) return { ok: true, status: 202 } as Response
        if (String(url).includes('network-failure')) throw new TypeError('network down')
        const status = String(url).includes('denied') ? 403 : 200
        return { ok: status === 200, status } as Response
    })
    vi.stubGlobal('fetch', send)
    const { Dap } = await import('../Dap')
    Dap.shared.setEnabled(true)
    Dap.shared.init()
    const path = '/api/v1/space/dap-selftest/projects'
    await fetch(`${location.origin}${path}`, { method: 'POST' })
    await fetch(`${location.origin}/fleet/api/v1/workspaces`, { method: 'POST' })
    await fetch(`${location.origin}${path}`, { method: 'GET' })
    await fetch(`${location.origin}/api/v1/space/denied/projects`, { method: 'POST' })
    await fetch(`${location.origin}/api/v1/space/network-failure/projects`, { method: 'POST' }).catch(() => {})
    await fetch(`https://external.invalid${path}`, { method: 'POST' })
    Dap.shared.flush()
    await Promise.resolve()
    const events = send.mock.calls.filter(([url]) => String(url).includes('/v1/e/b'))
        .flatMap((call) => JSON.parse((call as unknown as [string, RequestInit])[1].body as string).events)
        .filter((event) => event.event_name === 'workspace_created')
    expect(events).toHaveLength(2)
    for (const event of events) {
        expect(event.props).toBeUndefined()
        expect(JSON.stringify(event)).not.toContain('dap-selftest')
    }
    Dap.shared.setEnabled(false)
})
