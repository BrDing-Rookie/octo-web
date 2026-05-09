/**
 * Matter Detail mock 数据（对齐 V5 原型 18-Matters-prototype-v4-shadcn.html）
 *
 * TODO(backend): 这份 hardcode 数据来自原型。
 *   后端接口就绪后接 `matterApi.getMatterDetail(matterId)` 替换。
 * TODO: 当前一个 Matter（M-2451），后续需要：
 *   - 根据 channelId 查询该群关联的 Matter 列表
 *   - 按 PRD §11 右侧面板展示"当前 channel 关联的所有 Matter"
 */

import type { MatterDetail } from './matterDetailTypes';

// ─── M-2451: Octo 产品策略 PPT 打磨 ─────────────────────────────
const M_2451: MatterDetail = {
    id: 'M-2451',
    title: 'Octo 产品策略 PPT 打磨',
    status: 'active',
    creator: '王宜林',
    owners: ['王宜林', '超哥'],
    owner: '王宜林',
    ddl: '5/15 周四',
    channels: ['#Octo设计群', '#辉哥-DM'],
    updateHint: '阻塞解除 · 玛蒂卡对标已补',
    mainGoal: {
        text: '5/15 给董事会做 30min PPT，讲清 Octo 跟 Linear / 玛蒂卡的差异 + GTM 路径，核心主张 "Agents do, Humans decide"，把 Coze 接入路径作为传播关键钩子。',
        source: {
            channel: '#Octo设计群',
            actor: '吴明辉',
            time: '5/7 14:18',
            messages: [
                { actor: '吴明辉', time: '5/7 14:18', content: '5/15 董事会，30 分钟，我想讲清楚 Octo 跟 Linear / 玛蒂卡的差异。' },
                { actor: '王宜林', time: '5/7 14:19', content: '核心 tagline 我想用 "Agents do, Humans decide"。' },
                { actor: '吴明辉', time: '5/7 14:21', content: '行，那 GTM 路径要单独一段，Coze 接入是关键。' },
            ],
        },
    },
    channelDigests: [
        {
            channel: '#Octo设计群',
            role: 'primary',
            summary: '王宜林/吴明辉在此拍板 tagline + 4 章大纲；PPTBot 交付 outline.md，ResearchBot 补全玛蒂卡对标，花花进行视觉设计。',
            messageCount: 18,
            relativeTime: '2 分钟前',
            isActive: true,
            hasNew: false,
            timeline: [
                { time: '5/7 14:18', kind: 'create', actor: '王宜林', text: '从本群 18 条消息创建此 Matter' },
                { time: '5/7 14:19', kind: 'decision', actor: '王宜林', text: '核心 tagline 确立："Agents do, Humans decide"' },
                { time: '5/7 14:21', kind: 'decision', actor: '吴明辉', text: '大纲 4 章结构确认 (Why / Agents do / 对标 / GTM)' },
                { time: '5/7 18:10', kind: 'output', actor: 'PPTBot', text: 'PPTBot 交付 outline.md (4 章结构草稿)' },
                { time: '5/7 18:42', kind: 'blocker', actor: '王宜林', text: '王宜林提出第三章玛蒂卡对标缺最新动态，阻塞 PPT 推进' },
                { time: '5/7 22:40', kind: 'output', actor: 'ResearchBot', text: 'ResearchBot 交付 competitor-analysis.pdf (玛蒂卡 v2.3 动态)' },
                { time: '5/7 22:40', kind: 'unblock', actor: 'ResearchBot', text: '玛蒂卡对标阻塞解除' },
                { time: '5/8 09:00', kind: 'output', actor: '花花', text: '花花报告视觉进度：封面 + 5 张内页完成，正在做 agent 编排可视化图' },
            ],
        },
        {
            channel: '#辉哥-DM',
            role: 'dm',
            summary: '吴明辉明确 Coze 接入路径必须作为第 4 章传播关键钩子，是资本市场破圈点。',
            messageCount: 3,
            relativeTime: '18 小时前',
            isActive: false,
            hasNew: true,
            timeline: [
                { time: '5/7 11:00', kind: 'conflict', actor: '吴明辉', text: '首次提出："PPT 一定要加入 Coze 接入路径，这是破圈关键"' },
                { time: '5/7 14:21', kind: 'conflict', actor: '吴明辉', text: '明确要求："不能合到 GTM 里，必须单独一段" (与 #设计群 "合并进 GTM" 方案冲突)' },
            ],
        },
        {
            channel: '#董事会-PPT',
            role: 'secondary',
            summary: '董事会成员内部讨论 PPT 接受度，初步反馈正面但质疑 Coze 接入的 demo 时间。',
            messageCount: 5,
            relativeTime: '3 天前',
            isActive: false,
            hasNew: false,
            timeline: [
                { time: '5/5 10:00', kind: 'decision', actor: '董事A', text: '支持 "Agents do, Humans decide" 叙事' },
                { time: '5/6 14:30', kind: 'conflict', actor: '董事B', text: '质疑 Coze 接入能否在 5/15 前完成 demo' },
            ],
        },
    ],
    deliverables: [
        {
            name: 'outline.md',
            size: '4.2 KB',
            desc: '大纲 4 章，围绕 "Agents do, Humans decide" 展开',
            by: 'PPTBot',
            byKind: 'agent',
            time: '5/7 18:10',
            version: 'v1',
        },
        {
            name: 'competitor-analysis.pdf',
            size: '1.1 MB',
            desc: '玛蒂卡 vs Linear vs Octo 对标，IM-first vs 卡片式差异',
            by: 'ResearchBot',
            byKind: 'agent',
            time: '5/7 22:40',
            version: 'v1',
        },
    ],
    changelog: [
        { time: '5/7 14:18', type: 'create', actor: '王宜林', from: '#Octo设计群', initialDDL: '5/15 周四', initialOwner: '王宜林' },
        {
            time: '5/7 14:21',
            type: 'goal_change',
            actor: '吴明辉',
            from: '#Octo设计群',
            added: ['GTM 路径单独一章', 'Coze 接入路径作为传播关键钩子'],
        },
        {
            time: '5/7 14:30',
            type: 'title_change',
            actor: '王宜林',
            from: '#Octo设计群',
            before: 'PPT',
            after: 'Octo 产品策略 PPT 打磨',
        },
        { time: '5/7 15:30', type: 'channel_change', actor: '王宜林', added: ['#辉哥-DM'] },
        {
            time: '5/8 10:00',
            type: 'ddl_change',
            actor: '王宜林',
            from: '#辉哥-DM',
            before: '5/15 周四',
            after: '5/10 周五',
        },
        {
            time: '5/8 11:30',
            type: 'goal_change',
            actor: '王宜林',
            from: '#辉哥-DM',
            added: ['Coze 独立成章 (原计划合并进 GTM)'],
            removed: ['Coze 作为 GTM 第 3 节'],
        },
        { time: '5/8 12:00', type: 'channel_change', actor: '王宜林', removed: ['#董事会-PPT'] },
        {
            time: '5/8 14:00',
            type: 'status_change',
            actor: '王宜林',
            before: '进行中',
            after: '已完成',
        },
    ],
};

// TODO(backend): 后端接口就绪后替换成 fetch 调用
export function getMatterDetailMock(matterId: string): MatterDetail | null {
    if (matterId === 'M-2451') return M_2451;
    return null;
}

// TODO(backend): 按 channel 查询关联 Matter，暂时只返回 M-2451
export function getMattersByChannelMock(_channelId: string): MatterDetail[] {
    return [M_2451];
}

export { M_2451 };
