# GAP Analysis: dmworktodo (Frontend) vs matters (Backend)

> Generated: 2026-05-08
> Frontend: `codex.mlamp.cn:dmwork/dmwork-web` develop branch (`packages/dmworktodo`)
> Backend: `github.com/dmwork-org/todos` main branch (incl. PR #30 + #31)

---

## Summary

| Severity | Count | Impact |
|----------|-------|--------|
| P0 (运行时报错) | 7 | 请求 404 / 类型不匹配 / 功能完全失效 |
| P1 (功能缺失) | 5 | 新能力无法使用 |
| P2 (不一致) | 4 | 不影响运行但语义/展示错误 |
| **Total** | **16** | |

---

## P0 — 运行时报错

### GAP-01: API 路径 /todos → /matters (全量失效)

- **分类:** API 路径
- **涉及文件:** `src/api/todoApi.ts` (所有 HTTP 调用)
- **问题:** 前端 `BASE = '/todo/api/v1'`，所有请求路径为 `/todos/...` 和 `/goals/...`。后端已重命名为 `/api/v1/matters/...`，旧路径返回 404。
- **修复:**
  1. `BASE` 改为 `/matter/api/v1`（配合 Vite proxy 规则 `/matter/api/v1/*` → matters-service:8080）
  2. 所有函数中 `/todos` 改为 `/matters`，`/goals` 路径全部删除

### GAP-02: Goals 模块 — 后端已删除，全部 404

- **分类:** 废弃代码
- **涉及文件:**
  - `src/api/todoApi.ts` — 6 个 Goal API 函数 (listGoals, getGoal, createGoal, updateGoal, deleteGoal, transitionGoalStatus)
  - `src/bridge/types.ts` — Goal, GoalStatus, GoalDetail, GoalAssignee, CreateGoalReq, UpdateGoalReq
  - `src/hooks/useGoalList.ts` — 整个文件
  - `src/pages/TodoPage.tsx` — GoalCard, GoalStatusBadge, NewGoalDialog, sidebar "项目" 区域, `goal_id` 导航逻辑
  - `src/ui/DetailPanel/index.tsx` — goals 下拉选择器, `handleGoalChange`, `listGoals()` 调用
- **问题:** 后端 `refactor/todo-to-matter` 完全移除 Goal model。前端加载 goals 数据会 404，sidebar 项目区空白。
- **修复:** 删除所有 Goal 相关代码。sidebar 导航改为纯 filter 模式（我负责的 / 我发起的 / 全部）。DetailPanel 移除"所属项目"。

### GAP-03: Status 枚举不匹配 (closed → done, 缺 archived)

- **分类:** 状态枚举
- **涉及文件:**
  - `src/bridge/types.ts` — `TodoStatus = 'open' | 'closed'`
  - `src/hooks/useTodoList.ts` — `toggleStatus()` 硬编码 `closed`
  - `src/ui/TodoStatusBadge/index.tsx` — `STATUS_LABELS` 只有 open/closed
  - `src/ui/TodoFilterBar/index.tsx` — `STATUS_OPTIONS` 只有 open/closed
  - `src/ui/DetailPanel/index.tsx` — `handleToggleStatus` 使用 `closed`
  - `src/pages/TodoPage.tsx` — `groupByTime()` 判断 `todo.status === 'closed'`
  - `src/panel/ChatTodoPanel/index.tsx` — Tab 过滤 `'open'` / `'closed'`
  - `src/ui/TodoCard/index.tsx` — `isClosed = todo.status === 'closed'`
- **问题:** 后端状态为 `open | done | archived`。前端发送 `status: 'closed'` → 后端返回 400 "status must be 'open', 'done', or 'archived'"。
- **修复:**
  1. types.ts: `TodoStatus = 'open' | 'done' | 'archived'`
  2. 所有 `'closed'` → `'done'`
  3. 新增 `'archived'` 的 UI 展示
  4. toggleStatus 逻辑：open → done, done → open, archived 不可直接 toggle

### GAP-04: Attachments 独立端点 — 后端已移除

- **分类:** API 路径
- **涉及文件:**
  - `src/api/todoApi.ts` — `listAttachments()`, `createAttachment()`, `deleteAttachment()`
  - `src/bridge/types.ts` — `TodoAttachment` interface
  - `src/ui/DetailPanel/index.tsx` — 附件列表区域, `handleAddAttachment`, `handleDeleteAttachment`
- **问题:** 后端已将 attachments 折入 comments（PR `03d601b`）。`/matters/:id/attachments` 路径不存在 → 404。
- **修复:**
  1. 删除 3 个 attachment API 函数
  2. 修改 `addComment` → 支持 `{ content, attachments: [{file_url, file_name, file_size, mime_type}] }`
  3. 从 comment 响应中提取 `comment.attachments[]` 展示附件
  4. DetailPanel 附件区改为从 comments 数据聚合展示

### GAP-05: TodoListParams.goal_id — 后端不接受

- **分类:** API 路径 / 参数不匹配
- **涉及文件:**
  - `src/bridge/types.ts` — `TodoListParams.goal_id`
  - `src/hooks/useTodoList.ts` — `if (goalId) params.goal_id = goalId`
  - `src/pages/TodoPage.tsx` — `buildParams()` 返回 `{ goal_id: navView }`
- **问题:** 后端 List handler 不接受 `goal_id` query param（Goal 已删除）。虽不会 400，但过滤无效果——只是被忽略。
- **修复:** 删除 `goal_id` 相关过滤逻辑，同步删除 sidebar 中的 goalId 导航。

### GAP-06: CreateTodoReq.goal_id — 后端不接受

- **分类:** 类型定义 / 参数不匹配
- **涉及文件:**
  - `src/bridge/types.ts` — `CreateTodoReq.goal_id`
  - `src/api/todoApi.ts` — `createTodo()` 发送 goal_id
- **问题:** 后端 `createMatterReq` 无 `goal_id` 字段。发了只是被忽略（Gin `ShouldBindJSON` 忽略未知字段），不报错但无意义。
- **修复:** 从 `CreateTodoReq` 和 `UpdateTodoReq` 移除 `goal_id`。

### GAP-07: UpdateTodoReq.goal_id — 后端 updateMatterReq 不接受

- **分类:** 类型定义
- **涉及文件:**
  - `src/bridge/types.ts` — `UpdateTodoReq.goal_id`
  - `src/ui/DetailPanel/index.tsx` — `handleGoalChange` 发送 `{ goal_id: ... }`
- **问题:** 后端 `updateMatterReq` 只接受 `title`, `description`, `deadline`, `remind_at`。发送 `goal_id` 被忽略。
- **修复:** 移除。

---

## P1 — 功能缺失

### GAP-08: Channels 关联管理 — 前端无实现

- **分类:** 缺失功能
- **涉及文件:** 无（需新建）
- **问题:** 后端新增 `POST /matters/:id/channels` (LinkChannel) 和 `DELETE /matters/:id/channels/:channel_id` (UnlinkChannel)。前端无任何调用或 UI。
- **后端契约:**
  - LinkChannel body: `{ channel_id: string, channel_type: uint8(1|2|5), channel_name?: string }`
  - Response: MatterChannel object `{ id, matter_id, channel_id, channel_type, channel_name, linked_by, created_at }`
  - UnlinkChannel: DELETE path param
- **修复:**
  1. `todoApi.ts` 新增 `linkChannel(matterId, req)` + `unlinkChannel(matterId, channelId)`
  2. `types.ts` 新增 `MatterChannel` interface
  3. DetailPanel 新增"关联频道"展示区 + 增删操作

### GAP-09: Participants — 前端无展示

- **分类:** 缺失功能
- **涉及文件:** `src/bridge/types.ts` (TodoDetail 缺字段)
- **问题:** 后端 `MatterDetail` 返回 `participants: []string`（参与者 UID 列表），前端 `TodoDetail` interface 无此字段。
- **后端逻辑:** 评论者自动成为 participant，participant 有 read 权限。
- **修复:**
  1. `TodoDetail` 新增 `participants?: string[]`
  2. DetailPanel 展示参与者列表（只读）

### GAP-10: MatterDetail.channels — 前端无展示

- **分类:** 缺失功能
- **涉及文件:** `src/bridge/types.ts` (TodoDetail 缺字段)
- **问题:** 后端 `MatterDetail` 返回 `channels: []*MatterChannel`，前端 `TodoDetail` interface 无此字段。
- **修复:**
  1. `TodoDetail` 新增 `channels?: MatterChannel[]`
  2. DetailPanel 展示关联频道列表

### GAP-11: Comment 带 Attachments — 前端不支持

- **分类:** 缺失功能
- **涉及文件:**
  - `src/api/todoApi.ts` — `addComment()` 只发 `{ content }`
  - `src/ui/DetailPanel/index.tsx` — 评论渲染不展示 `comment.attachments`
- **问题:** 后端 comment 创建支持 `{ content, attachments: [{file_url, file_name, file_size, mime_type}] }`，且响应含 `attachments[]`。前端无法创建带附件的评论，也不展示评论附件。
- **后端 MatterComment 结构:**
  ```json
  {
    "id": "...",
    "matter_id": "...",
    "user_id": "...",
    "content": "nullable",
    "created_at": "...",
    "attachments": [{ "id", "comment_id", "file_url", "file_name", "file_size", "mime_type", "created_at" }]
  }
  ```
- **修复:**
  1. `TodoComment` type 新增 `attachments?: CommentAttachment[]`
  2. `addComment()` 签名改为 `(matterId, content, attachments?)`
  3. DetailPanel 评论区渲染附件
  4. 附件上传 UI 移入评论输入框

### GAP-12: Comment 分页 — 前端未实现

- **分类:** 缺失功能
- **涉及文件:** `src/api/todoApi.ts` — `listComments()` 返回 `TodoComment[]`
- **问题:** 后端 `GET /matters/:id/comments` 支持 `limit` + `cursor` 分页，返回 paginated response。前端假设一次拉全。
- **修复:** `listComments` 返回 `PaginatedList<TodoComment>`，DetailPanel 添加"加载更多"。

---

## P2 — 不一致但不崩溃

### GAP-13: 认证头 `token` vs `Authorization: Bearer`

- **分类:** API 路径 / 认证
- **涉及文件:** `src/api/todoApi.ts` — interceptor 发送 `headers['token'] = token`
- **问题:** 后端 middleware 期望 `Authorization: Bearer <token>`。当前通过 Vite proxy 或 nginx 可能有 header 转换层。若没有 → 401。
- **修复:** 确认 proxy 层是否转换。若无转换，改 interceptor 为 `headers['Authorization'] = 'Bearer ' + token`。

### GAP-14: 前端 TodoDetail.assignees 字段类型 vs 后端

- **分类:** 类型定义
- **涉及文件:** `src/bridge/types.ts` — `TodoAssignee.todo_id`
- **问题:** 后端 model 为 `MatterAssignee`，字段名 `matter_id`（非 `todo_id`）。JSON tag 仍为 `json:"matter_id"`。
- **修复:** `TodoAssignee.todo_id` → `matter_id`（或保持前端命名，解析时 map）。需确认后端实际 JSON tag。

### GAP-15: 前端命名 "Todo" 全局未迁移

- **分类:** 命名差异
- **涉及文件:** 所有文件（组件名 TodoCard, TodoPage, useTodoList 等）
- **问题:** 后端完成 Todo → Matter 重命名。前端内部命名仍用 Todo。功能不受影响，但语义混乱。
- **修复:** 建议 Phase 2 整体 rename（文件名 + export + import），或保持前端内部命名不变（只对齐 API 和 types）。优先级低。

### GAP-16: List response 中 items 缺少 assignees/participants/channels

- **分类:** 类型定义
- **涉及文件:** `src/bridge/types.ts` — `Todo` interface
- **问题:** 后端 List 返回的是 `[]*Matter`（不含 assignees），前端 `TodoCard` 的 `assigneeUids` 始终传空数组 `[]`。功能上可工作（显示空），但负责人头像永远不展示。
- **修复:** 暂保持现状（List 不返回 assignees），或前端在 Get 详情时展示。此为设计选择非 bug。

---

## 改动量评估

| Phase | 改动项 | 估算工作量 |
|-------|--------|-----------|
| Phase 1: API 对齐 | BASE 路径 + status 枚举 + 认证头 + 删 Goal API | ~150 行改 |
| Phase 2: Goals 清理 | 删 useGoalList, GoalCard, NewGoalDialog, sidebar 项目区, DetailPanel goal 选择器 | ~400 行删 + ~50 行改 |
| Phase 3: Attachments 合入 Comments | 删独立 attachment API + 改 comment 创建/展示 | ~200 行改 |
| Phase 4: 新增 Channels + Participants | 新 API + 新 types + DetailPanel 展示 | ~200 行增 |
| **Total** | | ~600 行删 + ~600 行改/增 |

---

## 建议 PR 拆分

1. **PR-1: 基础对齐** (P0 fix) — GAP-01, 03, 05, 06, 07, 13
   - 改 BASE 路径、status 枚举、删 goal_id 引用、认证头
   - 改完前端可以跑起来（除了 Goals UI 空白 + Attachment 404）

2. **PR-2: Goals 模块移除** (P0 fix) — GAP-02
   - 删除所有 Goal 代码，sidebar 简化为三项导航
   - UI 重构

3. **PR-3: Attachments 迁移** (P0 fix) — GAP-04, 11
   - 删独立 attachment 端点，改为 comment 附件
   - DetailPanel 附件区重写

4. **PR-4: 新能力接入** (P1) — GAP-08, 09, 10, 12
   - Channels 管理 + Participants 展示 + Comment 分页
