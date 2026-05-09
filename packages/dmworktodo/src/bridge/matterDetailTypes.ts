/**
 * Matter Detail 类型（v0.7 PRD + V5 原型 shape 对齐版）
 *
 * ⚠️ 这是新的 Matter 概念（hierarchy 总结视图），跟本包里旧的 Todo 数据模型并存。
 * 旧的 `bridge/types.ts` Matter = 扁平 todo；这里的 MatterDetail = PRD v0.7 派生视图。
 *
 * TODO(backend): 这些类型还是 UI 驱动的 shape，后端接口就绪后跟后端协议对齐。
 * TODO: 原型里 actor/user shape 跟 Octo IM 的 UID/name 体系不一样，后续需要 bridge。
 */

export type MatterStatus = 'active' | 'done' | 'archived';
export type ActorKind = 'human' | 'agent';

/** 群聊角色（同一 Matter 在不同群里的角色） */
export type DigestRole = 'primary' | 'secondary' | 'dm';

/** 时间线事件类型（V5 signal map） */
export type TimelineKind =
    | 'create' // 创建
    | 'decision' // 有新决策
    | 'output' // 有新产出
    | 'blocker' // 阻塞
    | 'unblock' // 阻塞解除
    | 'conflict'; // 要求变更

/** 变更记录类型 */
export type ChangelogType =
    | 'create'
    | 'goal_change'
    | 'title_change'
    | 'ddl_change'
    | 'status_change'
    | 'channel_change';

/** 产出文件扩展名（UI 颜色映射用） */
export type DeliverableExt = 'md' | 'pdf' | 'fig' | 'png' | 'doc' | 'xlsx' | 'jpg' | string;

export interface AnchorMessage {
    actor: string;
    time: string;
    content: string;
}

export interface MatterSourceRef {
    channel: string;
    actor: string;
    time: string;
    messages: AnchorMessage[];
}

/** 主目标（mainGoal）— HEAD 紫色左条高亮块 */
export interface MainGoal {
    text: string;
    source: MatterSourceRef;
}

/** 群聊蒸馏（channelDigests 数组成员） */
export interface ChannelDigest {
    channel: string;
    role: DigestRole;
    /** AI 一句话最新进展 */
    summary: string;
    messageCount: number;
    relativeTime: string;
    isActive: boolean;
    hasNew: boolean;
    timeline: TimelineEvent[];
}

export interface TimelineEvent {
    time: string;
    kind: TimelineKind;
    actor: string;
    text: string;
}

/** 产出文件 */
export interface Deliverable {
    name: string;
    size: string;
    desc: string;
    by: string;
    byKind: ActorKind;
    time: string;
    version?: string;
}

/** 变更记录（多种 shape union） */
export interface ChangelogBase {
    time: string;
    type: ChangelogType;
    actor: string;
    from?: string;
}

export interface ChangelogCreate extends ChangelogBase {
    type: 'create';
    initialDDL: string;
    initialOwner: string;
}

export interface ChangelogGoalChange extends ChangelogBase {
    type: 'goal_change';
    added?: string[];
    removed?: string[];
}

export interface ChangelogTitleChange extends ChangelogBase {
    type: 'title_change';
    before: string;
    after: string;
}

export interface ChangelogDdlChange extends ChangelogBase {
    type: 'ddl_change';
    before: string;
    after: string;
}

export interface ChangelogStatusChange extends ChangelogBase {
    type: 'status_change';
    before: string;
    after: string;
}

export interface ChangelogChannelChange extends ChangelogBase {
    type: 'channel_change';
    added?: string[];
    removed?: string[];
}

export type ChangelogEntry =
    | ChangelogCreate
    | ChangelogGoalChange
    | ChangelogTitleChange
    | ChangelogDdlChange
    | ChangelogStatusChange
    | ChangelogChannelChange;

export interface MatterDetail {
    id: string;
    title: string;
    status: MatterStatus;
    creator: string;
    /** 多负责人（v0.7+ 支持多人） */
    owners: string[];
    /** @deprecated 兼容旧数据，优先用 owners */
    owner?: string;
    /** Deadline 友好文本（例："5/15 周四"），DB 真实字段应该是 ISO */
    ddl: string;
    /** 关联的 channel/thread 显示名称列表 */
    channels: string[];
    /** 更新提示（给列表卡用） */
    updateHint?: string;
    /** 主目标 */
    mainGoal: MainGoal;
    /** 关联群聊蒸馏（"关联群聊" tab） */
    channelDigests: ChannelDigest[];
    /** 产出文件（"产出文件" tab） */
    deliverables: Deliverable[];
    /** 变更记录（"变更记录" tab） */
    changelog: ChangelogEntry[];
}
