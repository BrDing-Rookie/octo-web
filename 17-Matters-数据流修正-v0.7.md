# Matters · 数据流 PRD v0.7 (工程蓝本)

> **状态**: v0.7 PRD (工程实现的最终蓝本)
> **日期**: 2026-05-08
> **作者**: 王宜林
> **此版定位**: 洁净版 — 只讲设计, 不解释 why; 给前端 / 后端落地

---

## 1. 一句话定调

> **Matter = IM 信息的 hierarchy 总结视图。**
>
> 一切操作 (人 + Agent) 都发生在 IM, Matter 是只读派生视图。
> 用户主动触发 (创建 / 关联 / 一键总结) 决定哪些信息进 Matter。

---

## 2. 核心架构 — 双层

```
执行层 (Agents do)              决策层 (Humans decide)
─────────────────────────────  ─────────────────────────────
Agent 在 IM 里干活               用户在 IM 里决策
  - 跟人平等身份, 没特权通道       - 右键 Agent 消息 → 引用回复
  - 发消息 / 发文件 / 跑工具       - 自动带 @<Agent> + 用户输入
  - 进展散落在群里 (跨群也行)      - 引用回复 = "humans decide" 的物理动作
                                                                    
        ↓                              ↓
        └── IM 群 (唯一信息源) ────────┘
                    ↓
               用户主动触发 (创建 / 关联 / 一键)
                    ↓
              Octo 自带助手按 Schema 整理
                    ↓
               Matter (只读派生视图)
```

### 2.1 设计取舍 — 为什么 IM 是唯一信息源

如果允许双源 (Matter 也接受写操作 + IM 也接受写操作), 同步逻辑会变成噩梦:

```
- 在 Matter 里加的内容要回写 IM 吗? 写到哪个 channel?
- 在 IM 里发的消息要自动进 Matter 吗? 哪些进哪些不进?
- 用户在两端各编辑一次, 谁覆盖谁?
```

走单源:

```
- IM = 行为场所 (人 + Agent 都在这里"做事")
- Matter = 派生视图 (只读, 用户主动触发整理)
- 一致性来自"只有一个真理来源"
```

---

## 3. 智能创建 Matter

### 3.1 触发流程

```
用户在 IM 多选 N 条消息 → 右键 "+ 创建新事项"
   ↓
Octo 自带助手 (类似智能总结) 蒸馏 N 条消息
   ↓
弹出"智能创建 Matter" 表单 — AI 已预填全部字段
   ↓
用户审核 / 修改 / 补全 → 点 [创建]
   ↓
Matter 生成, 这 N 条消息自动作为该 channel 的 segment 首段
```

### 3.2 智能创建表单 (4 字段, 全部必填)

```
+────────────────────────────────────────+
│ 智能创建事项                              │
+────────────────────────────────────────+
│ 标题:     [AI 提取的事件标题, 可改]        │  必填
│ BRIEF:    [AI 智能总结预填, 可改]         │  必填
│ 负责人:    [AI 语义识别, 不识别需用户选]   │  必填
│ Deadline: [AI 语义识别, 不识别需用户选]   │  必填
+────────────────────────────────────────+
│              [创建]  [取消]               │
+────────────────────────────────────────+
```

### 3.3 AI 语义预填规则

```
[1] 标题
    从 N 条消息提炼"这件事" 的 5-15 字标题
    例: "辉哥 5/15 PPT 30min" / "客户合同审查"

[2] BRIEF
    AI 蒸馏 1-3 句关键内容 (上下文 + 目标)
    例: "辉哥要 5/15 给董事会做 30min PPT, 讲清 Octo vs Linear/玛蒂卡 + GTM 路径"

[3] 负责人
    AI 从消息识别"被指派或主动认领的人"
    线索: "@小张 你来做" / "辛苦 @小李 推进一下" / "我来吧"
    不识别 → 用户必须从 channel 成员中选一个 (不能空过)

[4] Deadline
    AI 从消息识别"截止时间"
    线索: "5/15 之前" / "下周三" / "本月底" / "明天"
    不识别 → 用户必须填一个具体日期 (不能空过)
```

---

## 4. 用户关联 context 到 Matter 的两条路径

### 4.1 路径 A · 多选关联 (针对已有 Matter)

```
用户在 IM 多选 N 条消息 → 右键
   ↓
+─────────────────────────+
│ 消息处理                   │
+─────────────────────────+
│ + 创建新事项                │ ← 走 § 3 智能创建
│ → 关联到 No.1 / No.2 ...   │ ← 仅显示用户有权关联的 Matter
+─────────────────────────+
   ↓
后台按 Feed Schema (§ 6) 整理这 N 条消息
   ↓
增量加进 Matter (按 channel 找到对应 segment, 去重后加 nodes)
```

### 4.2 路径 B · 一键总结本群跟本 Matter 相关的内容

```
Matter 详情页, 段顶部:
  [ + 一键总结本群跟本 Matter 相关的内容 ]
   ↓
Octo 自带 Agent (类似智能总结) 扫本群消息
   ↓ (按时间窗 / 跟本 Matter 相关的判定)
按 Feed Schema 整理 → 增量加进 Matter
```

跨群协作场景:

```
发起人在 #设计群, 负责人转给 #辉哥-DM 同学干活
负责人在 #辉哥-DM 干完, 在 Matter 详情页点
  "一键总结本群跟本 Matter 相关的内容"
#辉哥-DM 内容 → Matter 一段
即使发起人不在 #辉哥-DM, 也能在 Matter 里看到 #辉哥-DM 进展
  (通过 § 7 上下文锚点)
```

两条路径并存:

```
路径 A 适合: 信息少 / 关键 / 用户精准选择
路径 B 适合: 信息多 / 散乱 / 跨群协作 / 减用户负担
```

---

## 5. 角色 + 权限矩阵

### 5.1 权限主体定义

```
发起人 (Creator)
  - 创建 Matter 的人
  - 不一定是负责人

负责人 (Owner / Assignee)
  - 实际推进事项的人
  - 可能跟发起人是同一个人, 也可能不是
  - Matter 创建时必填 (NOT NULL)

关联 channel 成员
  - Matter 关联到某 channel/thread
  - 该 channel/thread 的所有成员自动获得 Matter access
  - 飞书文档式权限继承
```

#### 5.1.1 设计取舍 — 为什么不立"围观群众" 角色

系统层无法判别一个 channel 成员是"围观" 还是"实际在干活但没被指定":

```
例 [1]: 发起人 @了 A 让她做, A 没回, B 主动跳出来帮忙做了
        B 是围观还是 owner? 系统无法判断

例 [2]: 围观者 C 在群里随手扔了个有用链接, 然后就没动作了
        这是围观还是协作? 系统无法判断
```

立"围观" 角色 = 系统硬给一个无法可靠判断的标签 → 容易误伤

不立 = 用 channel 成员关系自然继承 access, 不强加身份

### 5.2 权限矩阵

```
+──────+──────+─────+──────+────────+────────+──────+──────+──────+──────+
│ 操作    │ 创建  │ 读   │ 转发   │ 多选关联 │ 一键拉群│ 改状态 │ 归档  │ 删自加 │ 删全部│
+──────+──────+─────+──────+────────+────────+──────+──────+──────+──────+
│ 发起人  │ [v]  │ [v] │ [v]  │ [v]    │ [v]    │ [v]  │ [v]  │ [v]  │ [v]  │
│ 负责人  │  -   │ [v] │ [v]  │ [v]    │ [v]    │ [v]  │  -   │ [v]  │ [v]  │
│ 关联成员│  -   │ [v] │ 隐藏  │ [v]    │ [v]    │  -   │  -   │ [v]  │  -   │
+──────+──────+─────+──────+────────+────────+──────+──────+──────+──────+
```

要点:

```
[1] 转发权限只给发起人 + 负责人, 关联成员 [转发] 按钮直接隐藏

[2] 归档只给发起人

[3] 关联成员能多选关联 / 一键拉群 (CRUD 自加内容)
    - 但只能 CRUD 自己加的条目
    - 发起人/负责人能 CRUD 全部条目

[4] 关联成员不进左 sidebar 的"我发起/我负责" 栏
    - 但出现在"全部" 栏 (§ 10), 也出现在 channel/thread 右侧 Matter 列表
```

---

## 6. Feed Schema — 卷宗段 (按 channel/thread)

### 6.1 段 = 一个 channel/thread 的内容池

```
Matter Feed = [
  Segment for #设计群,
  Segment for #辉哥-DM,
  Segment for thread::PPT-讨论,
  ...
]

每个 segment = Matter 关联到的某个 channel/thread 上累积的所有相关消息
一次触发可能往已有 segment 里增量补充 (跨多次触发去重合并)
```

#### 6.1.1 设计取舍 — 为什么 segment 按 channel 分而非按"一次触发" 分

按"一次触发 = 一段" 的问题:

```
- 同一 channel 短时间内多人触发 → 几乎相同的两段, 视觉重复
- 不同人在不同时间点触发同一群 → 老段 vs 新段重叠, 用户难判断哪段为准
- 用户认知里"群是分组, 不是事件"
```

按"一个 channel = 一段":

```
- 同 channel 的所有触发汇入一段, 增量补充, 去重合并
- 跨群协作时按来源天然分组 (#设计群 一段 / #辉哥-DM 一段), 一目了然
- 跟 IM 心智一致 ("群" 是用户的一级心智, "触发" 不是)
```

### 6.2 多次触发的增量补充 + 去重

```
首次触发某 channel:
  ↓
  创建 segment for channel X
  整理消息 → segment.nodes
  
增量触发 (同 channel 再次, 即使不同人):
  ↓
  整理本次消息 → 跟已有 nodes 去重 → 增量加入
  更新 segment.last_pulled_at + segment.last_pulled_by
  pull_count += 1
```

去重判定 (后端二选一, 由后端 decide):

```
方案 1 · DB 唯一索引 (推荐, 简单)
─────────────────────────────────
matter_segment_node 加 unique constraint:
  (anchor_channel_id, anchor_message_seq)

INSERT 时使用 ON CONFLICT DO NOTHING:
  ╔══════════════════════════════════════════════════╗
  ║ INSERT INTO matter_segment_node (...)             ║
  ║ VALUES (...)                                      ║
  ║ ON CONFLICT (anchor_channel_id, anchor_message_seq)║
  ║   DO NOTHING                                      ║
  ╚══════════════════════════════════════════════════╝

工程要求:
  - Agent 一键总结 / 多选关联返回每条消息时必须带 message_seq
  - Octo IM 现有体系: 每条消息确定有 seq, 满足要求


方案 2 · AI 语义去重 (容错强, 成本高)
─────────────────────────────────
入库前对新拉取消息 vs 已有 nodes 做内容相似度对比:

候选实现:
  a) 字符级: levenshtein 距离 / 编辑距离阈值
  b) embedding: 嵌入向量余弦相似度 > 0.95 视为重复
  c) LLM 直接判断: prompt"以下两段消息是否表达同一内容"

→ 默认推方案 1, 后端可在工程现实下二选一
```

### 6.3 段头字段

```
Segment {
  id: SegmentId
  matter_id: MatterId
  
  channel_id, channel_type        -- (matter_id, channel_id) UNIQUE
  channel_name: String             -- 冗余, 显示用
  
  first_pulled_at: Timestamp       -- 首次触发时间
  first_pulled_by: UserId          -- 首次触发人
  last_pulled_at: Timestamp        -- 最近一次触发
  last_pulled_by: UserId           -- 最近一次触发人
  pull_count: Int                  -- 累计触发次数
  
  segment_summary: String          -- AI 一句话总结 (基于全部 nodes, 每次触发后更新)
  
  nodes: [SegmentNode]             -- 段内节点 (按 timestamp 排)
}
```

### 6.4 段间排列 + 段内排列

```
段间 (segments) 排列:
  按 first_pulled_at 升序 (谁先被关联谁先排在上面)
  默认折叠老段, 最新 1-2 段展开
  段头永远显示 (折叠态露段头 + segment_summary)

段内 (nodes) 排列:
  按 timestamp 升序 (跟 IM 时间流一致)
  最新一条在底部
```

段头视觉差异 (按"是否还在更新" 区分):

```
活跃段 (1 周内有新拉取): 浅蓝背景
冷段 (1 周以上无新拉取): 浅灰背景
```

### 6.5 段内节点 schema (universal, 分类 [TBD-1])

```
SegmentNode {
  id: NodeId
  segment_id: SegmentId
  matter_id: MatterId
  
  // 通用字段
  actor_kind: 'human' | 'agent'
  actor_id, actor_name
  timestamp: Timestamp           -- IM 原消息时间, 用于段内排序
  
  // 上下文锚点 (§ 7, 必存)
  anchor: {
    channel_id, channel_type,
    message_seq,
    content,
    context_before: [Message],
    context_after: [Message]
  }
  
  // 分类 [TBD-1]
  category?: TBD
  
  // payload [TBD-1]
  payload: TBD
}
```

### 6.6 产物 (Deliverable) 节点

```
DeliverableNode {
  ... universal SegmentNode 字段 ...
  
  file: {
    name: String,
    size: String,
    type: 'md' | 'pdf' | 'fig' | 'png' | 'doc' | 'xlsx' | ...
  }
  sender: User | Agent
  source_channel: ChannelRef
}
```

产物触发条件:

```
路径 A · 多选关联:
  用户选了文件附件 → 直接加进 Matter (用户已显式判断)

路径 B · 一键拉群:
  Agent 扫本群消息时检测到文件附件
  Agent 判: 这个文件跟本 Matter (标题 / BRIEF / 已有内容) 相关吗?
  相关 → 加进 Matter
  不相关 → 跳过
```

---

## 7. 上下文锚点

### 7.1 节点视觉

```
▎ 辉哥 在 #辉哥-DM 11:00
 "PPT 一定要加入 Coze 接入路径"
 [↗ 看上下文]
```

### 7.2 popover 弹出窗

```
点击 [↗ 看上下文] 弹 popover:
  +────────────────────────────+
  │ #辉哥-DM · 5/8              │
  │                            │
  │ 王宜林 10:58: "PPT 进展如何?" │ ← context_before
  │ 辉哥 10:59: "我想再确认下..."  │
  │ 辉哥 11:00: "PPT 一定要加入   │ ← 主消息 (高亮)
  │   Coze 接入路径"            │
  │ 王宜林 11:02: "收到, 在哪段?"  │ ← context_after
  │ 辉哥 11:05: "GTM 那段"        │
  │                            │
  │ [跳到原对话 (有权限时显示)]    │
  +────────────────────────────+
```

### 7.3 存储格式 (必存原文)

```
anchor.content: String            -- 原消息全文 (必存)
anchor.context_before: [Message]  -- 前 N 条快照 ([TBD-3])
anchor.context_after: [Message]   -- 后 N 条快照
anchor.message_seq: BigInt        -- 双用途:
                                  --   (a) IM 端 ID, 跳转用 (有权限时)
                                  --   (b) 去重索引 (§ 6.2 方案 1)
                                  -- (channel_id, message_seq) 联合 UNIQUE
```

### 7.4 设计取舍 — 为什么 Matter 必存原文 (而不只存索引)

只存 message_seq 索引、点击时跳到 IM 渲染的问题:

```
[1] 跨群权限障碍
    用户 A 在 #设计群, Matter 关联 #辉哥-DM (A 不在该群)
    A 点节点 → 卡在 IM 权限墙上, 看不到内容
    存原文 = A 在 Matter 端就能看到该消息 (不依赖 IM 权限)

[2] 消息可能被删除 / 撤回
    IM 消息撤回后, message_seq 索引失效
    Matter 内容会"消失" — 用户当时看到的, 后来看不到了
    Matter 应保留快照, 行使"凝固一刻" 的视图职责

[3] Matter 检索 / 全文搜索的需要
    搜 Matter 时期望命中节点内容 (例: 搜"Coze 接入路径")
    若只存 seq, 搜索得回到 IM 才能匹配 — 性能差且跨权限难
    存原文 = Matter 自身可被全文检索
```

→ Matter 节点 anchor.content 必存 (NOT NULL)

### 7.5 设计取舍 — 为什么"看上下文" 而不是"跳到消息"

直接跳消息位置依赖"用户在该 channel 有权限"。跨群协作场景下经常不成立 (例: 发起人不在 #辉哥-DM 但负责人在那做事)。

popover 的方式:

```
- 显示主消息 + 前后窗口 (anchor.content + context_before/after)
- 用户在 Matter 端就能看完整对话, 不依赖跨群权限
- "跳到原对话" 按钮仅在有权限时显示, 作为加分项不作必需
```

---

## 8. Matter HEAD 结构

```
+──────────────────────────────────────────────────+
│ M-2451  [进行中 v]                       [转发]   │
│ Octo 产品策略 PPT 打磨                              │
│ 发起 王宜林 · 负责 王宜林 · DDL 5/15              │
│ 关联 (3): #设计群  #辉哥-DM  +1 [更多 v]           │
│                                                  │
│  [[*] BRIEF · 智能总结自 3 条聊天]      [展开]       │
│  辉哥要 5/15 给董事会做 30min PPT, 讲清 Octo vs    │
│  Linear / 玛蒂卡 + GTM 路径...                     │
│                                                  │
│  来自: [1] #设计群 · 吴明辉 [2] [3]                │
+──────────────────────────────────────────────────+
```

字段:

```
[v] Matter ID (M-2451)
[v] 状态 dropdown (进行中 / 已完成 / 已归档)
[v] 转发按钮 (按权限隐藏)
[v] 标题
[v] 发起人 / 负责人 / Deadline (DDL)
[v] 关联 channel 标签 (>3 时折叠 [TBD-2])
[v] BRIEF (展开/折叠)
[v] 来自 (BRIEF 引用源)
```

---

## 9. 状态机 (3 态)

```
进行中 (active)  ←── default
   │
   ├──[发起人/负责人]──> 已完成 (done)
   │                       │
   │                       └──[只发起人]──> 已归档 (archived)
   │
   └──[只发起人]──> 已归档 (archived)
```

状态切换权限:

```
进行中 → 已完成: 发起人 OR 负责人
已完成 → 已归档: 仅发起人
任意 → 已归档: 仅发起人 (跳过已完成态)
```

---

## 10. 左侧 sidebar 入口 (三栏)

沿用 Octo 现有任务面板设计 (Tasks/Todo 模块视觉一致)。

```
+─────────────────────────────+
│ 事项                  [+新建]  │
+─────────────────────────────+
│ ◆ 我负责的 (4)               │  ← 高频, 默认展开
│   M-2451 PPT 打磨            │
│     #设计群                   │
│   M-2390 客户合同审查         │
│     #法务-DM                  │
│   ...                       │
│                             │
│ ◆ 我发起的 (3)               │  ← 高频, 默认展开
│   M-2451 PPT 打磨  (重复)    │
│   ...                       │
│                             │
│ ◆ 全部 (15)            [v]   │  ← 兜底, 默认折叠
│   (我能 access 的所有 Matter)│
│                             │
│ [已归档 · 折叠展开]           │
+─────────────────────────────+
```

三栏含义:

```
我负责的: Matter.owner_id = 当前用户
我发起的: Matter.creator_id = 当前用户
全部:    当前用户能 access 的所有 Matter
         (含三类: 我发起 / 我负责 / 关联 channel 成员)
```

视觉细节:

```
- 每条 Matter 显示: M-编号 / 标题 / #channel-标签 / 状态 dropdown
- 截止时间显示 (今天/到期日)
- 三栏 tab 风格 (跟 Tasks "我负责/我发起/全部任务" 一致)
- 字号 / 间距 / 颜色 跟 Tasks 模块对齐
```

---

## 11. Matter 两个入口对照

```
+──────────────────────────+──────────────────────────────+
│ 左侧 sidebar (主入口)       │ Channel/Thread 右侧 (上下文入口) │
+──────────────────────────+──────────────────────────────+
│ 显示范围                   │ 显示范围                       │
│ - 我负责的 (默认展开)        │ - 当前 channel/thread          │
│ - 我发起的 (默认展开)        │   关联的所有 Matter             │
│ - 全部 (默认折叠, 含关联成员的)│   (作为关联成员可见的 Matter 也在)│
│                          │                              │
│ 用途                      │ 用途                          │
│ - 跟踪我的事项进展            │ - 边聊天边看 Matter            │
│ - 收集 deadline / 状态      │ - 看本群相关事项进展            │
│ - 全屏看详情                 │ - 多选关联 / 一键拉群           │
+──────────────────────────+──────────────────────────────+
```

---

## 12. 决策动作的物理位置

> **决策 = IM 引用回复**。

Octo IM 已自带"引用回复 → 自动 @ 被引用方" 的行为, 这就是用户决策的物理动作。
Matter 不发明新决策按钮, 只是把 IM 引用回复整理成 hierarchy 节点展示 (作为 segment 内的一条 node)。

### 12.1 设计取舍 — 为什么决策不在 Matter 里做

不让 Matter 接受决策操作 (按钮 / 引用回复 / 评论) 的理由:

```
[1] 双源问题 (回到 § 2.1 的噩梦)
    若 Matter 里发消息, 该消息也得同步回 IM
    "在哪个 channel 发?" "发哪条 thread?" 永远没干净答案

[2] Octo IM 已有"引用回复 → 自动 @" 行为
    用户已熟悉, 零学习成本; 不发明新动作

[3] 心智简化
    Matter = 只读视图, 一行字概括
    用户不会困惑"这里能干啥" — 答案恒定: 只能看
    决策行为统一到 IM, 不分散两端
```

---

## 13. 用户能在 Matter 里做的操作

```
[1] 看 (Read)
    - HEAD: 标题 / 状态 / 发起 / 负责 / DDL / 关联群 / BRIEF
    - Feed: 卷宗段 + 段内节点 + 上下文锚点 popover
    - 折叠/展开段

[2] 关联 context (路径 A + B, § 4)
    - 路径 A: 在 IM 多选关联
    - 路径 B: Matter 内部按钮"一键总结本群跟本 Matter 相关的内容"

[3] CRUD Matter 内容 (按权限, § 5)
    - 删自己加的条目: 关联成员/负责人/发起人都能
    - 删任意条目: 仅负责人/发起人

[4] 改状态 (status dropdown)
    - 进行中 / 已完成 / 已归档 (按权限)

[5] 转发 (按权限, 关联成员隐藏按钮)
    - 选目标 channel/thread, 发 Matter 卡片

不能在 Matter 里做的:
[x] 发消息 (回 IM 引用回复)
[x] 评论决策 (回 IM 引用回复)
```

---

## 14. 工程实现要点

### 14.1 数据模型 (核心表)

```
matter
  id, short_id (M-2451)
  title (NOT NULL)
  brief (NOT NULL)
  status: active | done | archived
  creator_id (NOT NULL, 发起人)
  owner_id (NOT NULL, 负责人)
  due_at (NOT NULL, Deadline)
  created_at, updated_at
  archived_at?

matter_channel (m:n, 关联多群)
  matter_id, channel_id, channel_type
  added_by, added_at
  -- (matter_id, channel_id) UNIQUE

matter_segment (按 channel 分段)
  id
  matter_id
  channel_id, channel_type
  channel_name             -- 冗余, 显示用
  
  first_pulled_at, first_pulled_by
  last_pulled_at, last_pulled_by
  pull_count: Int
  
  segment_summary
  created_at, updated_at
  
  -- (matter_id, channel_id) UNIQUE

matter_segment_node
  id
  segment_id, matter_id
  actor_kind: human | agent
  actor_id, actor_name
  timestamp
  category? ([TBD-1])
  payload (JSON)
  
  -- 上下文锚点
  anchor_channel_id, anchor_channel_type
  anchor_message_seq
  anchor_content (TEXT, 必存)
  anchor_context_before (JSON [Message])
  anchor_context_after (JSON [Message])
  
  -- 去重索引 (§ 6.2 方案 1)
  -- (anchor_channel_id, anchor_message_seq) UNIQUE

matter_role_grant (谁是发起/负责/关联成员)
  -- 不需要单独表, 通过 matter.creator_id / owner_id + channel 成员推导
```

### 14.2 复用 Smart Summary 的能力

```
[v] AI 智能总结引擎 (蒸馏 BRIEF / 一键拉群整理 / 创建表单 AI 预填)
[v] Citation 锚点机制 (channel + message_seq + 上下文窗口)
[v] 转发到聊天的 SummaryCardContent (Matter 卡片复用)
[v] WebSocket 实时推送 (新段加进来时, 在线用户实时看到)
[v] 跨多源 source 表 (matter_channel m:n 关系)
```

---

## 15. 待讨论 [TBD]

```
[TBD-1] 段内节点分类 schema 具体怎么切 (优先级最高)
        候选方向 (待用户后续 dig in):
          方向 A · 按内容类型 (发言 / 产物 / 决策)
          方向 B · 按时间 (无分类, 纯按 timestamp 排)
          方向 C · 按重要性 (头部 highlight + 详细列表)
          方向 D · 按角色 (发起方 / Agent / 负责方)
          方向 E · 自适应 (AI 判断本段最重要的 1-2 类, 其他折叠)
        → 此版本先留 universal schema, 分类规则下版本细化

[TBD-2] 关联群多了 (>3) UI 折叠 / 弹窗
        头部关联标签栏怎么展示, 不能堆所有群名
        → 参考智能总结的多 source 设计

[TBD-3] anchor.context_before/after 默认 N 条是否合理
        前端渲染 popover 的体积控制
        → 参考智能总结代码仓现有 context window 取值

[TBD-4] Matter 卡片在 IM 里的视觉
        转发到 channel/thread 后, 卡片消息长什么样
        → 当前: 类似智能总结纯文字消息
        → 未来: 富格式消息卡片 (后端 decide)

[TBD-5] 去重方案 1 vs 2 (后端 decide)
        § 6.2 给出方案 1 (DB unique 索引) 和方案 2 (AI 语义) 二选一
        默认推方案 1, 由后端工程师根据实际情况决定
```

---

## 16. 一句话收尾

> Matter 是 IM 信息的 hierarchy 总结视图; 一切操作 (人 + Agent) 在 IM 完成; Matter 只读派生。
>
> 智能创建 — 4 字段全部必填 (标题/BRIEF/负责人/Deadline), AI 语义预填可改, 不识别用户必须补。
>
> Feed 按 channel/thread 分段, 多次触发增量去重 (后端选 DB unique 或 AI 语义)。
>
> 决策 = IM 引用回复 (Octo 已有行为)。
>
> 节点能看上下文 (前后 N 条 + 原文必存), 但不一定能跳消息位置 (跨群权限可能不允许)。
>
> 段内分类 schema 留作 [TBD-1], 下一轮 dig in 再细化。
