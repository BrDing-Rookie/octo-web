/**
 * Agent Card API 类型定义
 * 根据 /tmp/shared/agent-card-server-api.md
 */

/** Session 状态 */
export type SessionStatus = 'running' | 'idle' | 'stopped';

/** 对话类型 */
export type PeerType = 'private' | 'group';

/** 渠道类型（使用 string 以支持未来扩展新渠道） */
export type ChannelType = string;

/** 核心文件分类 */
export type CoreFileCategory = 'identity' | 'tools' | 'config';

/** 进程状态 */
export type ProcessStatus = 'running' | 'idle' | 'stopped';

/** Gateway 连接状态 */
export type GatewayStatus = 'connected' | 'disconnected';

/**
 * 运行时信息
 */
export interface RuntimeInfo {
  /** 操作系统版本 */
  os_version: string;
  /** 处理器架构 */
  arch: string;
  /** 可写磁盘空间（GB） */
  disk_space_gb: number;
  /** 系统内存大小（GB） */
  memory_gb: number;
  /** 应用数据目录路径 */
  app_data_dir: string;
  /** Claw 版本号 */
  claw_version: string;
  /** 后台管理地址 */
  admin_url: string;
  /** 积分来源团队 */
  team_name: string;
  /** 进程状态 */
  process_status: ProcessStatus;
  /** Gateway 连接状态 */
  gateway_status: GatewayStatus;
  /** 所属 Gateway 名称 */
  gateway_name: string;
  /** Claw 本地配置 ID */
  claw_id: string;
  /** 该 Gateway 管理的总 Agent 数 */
  gateway_total_agents: number;
  /** 该 Gateway 存活的 Agent 数 */
  gateway_alive_agents: number;
  /** Node.js 环境版本 */
  nodejs_version: string;
  /** 网络连接延迟（ms） */
  network_latency_ms: number;
  /** 服务端最后收到心跳时间（ISO 8601） */
  last_heartbeat_at: string;
  /** 记忆文件保留数量 */
  memory_retention_count: number;
  /** 记忆保留策略说明 */
  memory_retention_note: string;
}

/**
 * Session 信息
 */
export interface SessionInfo {
  /** 会话 ID */
  session_id: string;
  /** 会话 Key */
  session_key: string;
  /** 渠道 */
  channel: ChannelType;
  /** 会话状态 */
  status: SessionStatus;
  /** 对话方名称 */
  peer_name: string;
  /** 对话类型 */
  peer_type: PeerType;
  /** 群成员数量（仅 group 类型有值） */
  group_member_count: number | null;
  /** 使用的 AI 模型名称 */
  model: string;
  /** 上下文已用 tokens */
  context_used: number;
  /** 上下文总量 tokens */
  context_total: number;
  /** 上下文使用百分比 */
  context_percent: number;
  /** 最近用户消息内容 */
  last_user_message: string;
  /** 最后活跃时间（ISO 8601） */
  last_active_at: string;
}

/**
 * 核心文件信息
 */
export interface CoreFile {
  /** 文件名 */
  file_name: string;
  /** 分类 */
  category: CoreFileCategory;
  /** 文件大小（bytes） */
  file_size: number;
  /** 内容预览（前 512 字符） */
  content_preview: string;
  /** 最后同步时间（ISO 8601） */
  last_synced_at: string;
}

/**
 * 记忆文件信息
 */
export interface MemoryFile {
  /** 文件名 */
  file_name: string;
  /** 文件大小（bytes） */
  file_size: number;
  /** 内容预览（前 512 字符） */
  content_preview: string;
  /** 最后同步时间（ISO 8601） */
  last_synced_at: string;
}

/**
 * Agent Card 数据
 */
export interface AgentCardData {
  /** Bot 唯一标识 */
  bot_id: string;
  /** 该 bot 当前所有 session 总数 */
  session_total: number;
  /** status 为 running 的 session 数量 */
  session_running_count: number;
  /** 最近一次上报时间（ISO 8601） */
  last_report_at: string;
  /** 运行时信息 */
  runtime_info: RuntimeInfo;
  /** Session 列表 */
  sessions: SessionInfo[];
  /** 核心文件列表 */
  core_files: CoreFile[];
  /** 记忆文件列表 */
  memory_files: MemoryFile[];
}

/**
 * Agent Card API 响应（HTTP 层封装）
 * 
 * 注意：这是完整的 HTTP 响应结构 { code, message, data }
 * 与 AgentCardService 中的 AgentCardResponse 别名不同，后者仅指 data 载荷
 */
export interface AgentCardResponse {
  code: number;
  message: string;
  data: AgentCardData;
}

/**
 * 文件内容数据
 */
export interface FileContentData {
  /** Bot 唯一标识 */
  bot_id: string;
  /** 文件名 */
  file_name: string;
  /** 文件 MIME 类型 */
  content_type: string;
  /** 文件大小（bytes） */
  file_size: number;
  /** 文件完整内容 */
  content: string;
  /** 最后同步时间（ISO 8601） */
  last_synced_at: string;
}

/**
 * 文件内容 API 响应
 */
export interface FileContentResponse {
  code: number;
  message: string;
  data: FileContentData;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
}
