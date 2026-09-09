import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { FETCH_RULES, FETCH_IGNORE } from '../FetchRules'
import { BODY_RULES } from '../BodyRules'
import { TRACK_RULES } from '../TrackRules'

/**
 * 收敛物一致性守卫(DAP-94 缺陷 D1/D2 的回归防线)。
 * =====================================================================
 * DAP_EVENTS.md 自称是「Review this table, not the diff」的单一收敛物 —— 前提是它枚举了每一个
 * 已 wire 的 octo-web-native 事件。dap350(#1443)把 100+ 个 fleet/doc 事件写进三张中央规则表
 * (FetchRules / BodyRules / TrackRules)后,DAP_EVENTS.md 一度严重滞后(计数/PR 号/范围表述失真、
 * 108 条 fleet/doc + webhook_edited 缺行),而 channelUniqueness 只 import 三张规则表、从不读收敛物,
 * 没有任何守卫会因此变红 —— 收敛物滞后被 CI 静默放过(DAP-94 D1)。
 *
 * 本守卫补上这条边:**每一个出现在三张规则表里的事件名,都必须在 DAP_EVENTS.md 里有一行文档**
 * (首列 `event` 反引号单元格)。有人日后往规则表新增一条规则却忘了补收敛物 → 立即红,逼其同步。
 *
 * 方向是单向的(规则表 ⊆ 收敛物):收敛物里还额外文档化了 imperative / helper / data-track / infra
 * 事件,它们不在规则表内、也无法在此静态枚举其站点,故不作反向断言。FETCH_IGNORE 是抑制哨兵、
 * 非事件名,排除。
 */

/** 三张规则表的事件名并集(排除 FETCH_IGNORE 哨兵)。 */
function ruleTableEvents(): Set<string> {
    const s = new Set<string>()
    for (const r of FETCH_RULES) if (r.event !== FETCH_IGNORE) s.add(r.event)
    for (const r of BODY_RULES) {
        for (const d of r.discriminators) s.add(d.event)
        if (r.fallbackEvent) s.add(r.fallbackEvent)
    }
    for (const r of TRACK_RULES) s.add(r.event)
    return s
}

/** 定位 DAP_EVENTS.md:从 cwd 起向上找,兼容「从包目录跑」与「从仓库根跑」两种 cwd。 */
function findDapEventsMd(): string {
    let dir = process.cwd()
    for (let i = 0; i < 8; i++) {
        for (const rel of ['src/Service/DAP_EVENTS.md', 'packages/dmworkbase/src/Service/DAP_EVENTS.md']) {
            const p = join(dir, rel)
            if (existsSync(p)) return p
        }
        const parent = resolve(dir, '..')
        if (parent === dir) break
        dir = parent
    }
    throw new Error('找不到 DAP_EVENTS.md')
}

/** 从 DAP_EVENTS.md 抽取「已文档化的事件名」= 每张表首列 `\`event\`` 反引号单元格。 */
function documentedEvents(): Set<string> {
    const md = readFileSync(findDapEventsMd(), 'utf8')
    const s = new Set<string>()
    for (const m of md.matchAll(/^\|\s*`([a-zA-Z0-9_]+)`\s*\|/gm)) s.add(m[1])
    return s
}

describe('DAP_EVENTS.md 收敛物一致性(D1/D2 回归守卫)', () => {
    const documented = documentedEvents()

    it('自检:收敛物被找到并解析出足够多的事件行(否则守卫形同虚设)', () => {
        // 反测:若路径算错 / 正则失配,集合会空 → 下面的 ⊆ 断言恒真。用一个稳定阈值 + 已知事件兜底。
        expect(documented.size).toBeGreaterThan(200)
        expect(documented.has('user_login')).toBe(true) // §1 fetch
        expect(documented.has('webhook_edited')).toBe(true) // D2:im/base body fallback
        expect(documented.has('task_board_filtered')).toBe(true) // §6 fleet fetch
        expect(documented.has('document_created')).toBe(true) // §6 doc fetch
    })

    it('每个中央规则表事件都在 DAP_EVENTS.md 有文档行(规则表 ⊆ 收敛物)', () => {
        const undocumented = [...ruleTableEvents()].filter((e) => !documented.has(e)).sort()
        expect(
            undocumented,
            `以下规则表事件在 DAP_EVENTS.md 无文档行(新增规则须同步补收敛物):\n${undocumented.join('\n')}`,
        ).toEqual([])
    })
})
