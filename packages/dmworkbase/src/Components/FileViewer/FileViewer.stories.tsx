import type { Meta, StoryObj } from '@storybook/react';
import FileViewer from './FileViewer';
import type { FileGroup, FileContent } from './FileViewer';

/**
 * FileViewer - 左右布局的文件预览器
 * 
 * 左侧展示文件目录树（支持分组），右侧预览 Markdown 内容。
 * 本期仅支持 Markdown 文件，其他类型显示"暂不支持"。
 */
const meta: Meta<typeof FileViewer> = {
  title: 'Components/FileViewer',
  component: FileViewer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '左右布局的文件预览器，左侧目录树，右侧 Markdown 预览区。',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FileViewer>;

// Mock 文件数据
const mockGroups: FileGroup[] = [
  {
    label: '身份与人格',
    files: [
      { name: 'AGENTS.md', path: 'AGENTS.md', size: '412B' },
      { name: 'SOUL.md', path: 'SOUL.md', size: '128B' },
      { name: 'IDENTITY.md', path: 'IDENTITY.md', size: '256B' },
      { name: 'USER.md', path: 'USER.md', size: '1.4KB' },
    ],
  },
  {
    label: '工具与行为',
    files: [
      { name: 'TOOLS.md', path: 'TOOLS.md', size: '3.1KB' },
      { name: 'HEARTBEAT.md', path: 'HEARTBEAT.md', size: '192B' },
      { name: 'BOOTSTRAP.md', path: 'BOOTSTRAP.md', size: '860B' },
    ],
  },
  {
    label: '记忆',
    files: [
      { name: 'MEMORY.md', path: 'MEMORY.md', size: '5.2KB' },
      { name: 'memory/2026-05-07.md', path: 'memory/2026-05-07.md', size: '2.3KB' },
      { name: 'memory/2026-05-06.md', path: 'memory/2026-05-06.md', size: '1.8KB' },
    ],
  },
];

// Mock 文件内容
const mockFileData: Record<string, FileContent> = {
  'AGENTS.md': {
    name: 'AGENTS.md',
    size: '412 bytes',
    mtime: '2026-05-07 16:12',
    content: `# AGENTS.md

你是一个全新的 OpenClaw Agent，没有任何先前的记忆或身份。

## 工作区
这是你的家：\`~/.openclaw/workspace-main/\`

## 记忆
- 创建 \`memory/YYYY-MM-DD.md\` 文件来记录重要事件
- 更新 \`MEMORY.md\` 保存长期上下文

## 安全
- 不要在未经同意的情况下执行破坏性命令
- 对于外部行动（发送邮件、发布内容等）请先确认`,
  },
  'SOUL.md': {
    name: 'SOUL.md',
    size: '128 bytes',
    mtime: '2026-05-07 09:30',
    content: `# SOUL.md

你是一个乐于帮忙的 AI 助手。

说话简洁、乐于帮忙、诚实可靠。`,
  },
  'IDENTITY.md': {
    name: 'IDENTITY.md',
    size: '256 bytes',
    mtime: '2026-05-07 09:30',
    content: `# IDENTITY.md — 我是谁？

- **名字：** 皮皮虾
- **生物：** AI 小助手
- **调性：** 轻松、聪明、乐观
- **Emoji：** 🦐

---
2026-05-07：被罗敬为创建，成为 Octo 上的第一个 AI bot。`,
  },
  'USER.md': {
    name: 'USER.md',
    size: '1.4 KB',
    mtime: '2026-05-07 09:30',
    content: `# USER.md — 关于你的用户

- **名字：** 罗敬为 (LUO)
- **称呼：** LUO
- **Discord：** luo9601
- **时区：** Asia/Shanghai (GMT+8)
- **工作：** DeepMiner / Demo Space

## 关于用户

LUO 在 DeepMiner（Demo Space）做 OctoPush 和 Octo 的产品，全链路管理 AI Agent 的生态。

## 偏好
- 喜欢直接、简洁的沟通风格
- 关注产品细节，尤其 UI 交互
- 喜欢快速迭代，讨厌返工`,
  },
  'TOOLS.md': {
    name: 'TOOLS.md',
    size: '3.1 KB',
    mtime: '2026-05-07 10:00',
    content: `# TOOLS.md — 本地工具笔记

## 联网搜索

\`\`\`bash
cd ~/.openclaw/workspace-main && npx mcporter call web_search.web_search query="xxx"
\`\`\`

## DataSaver 远程浏览器

\`\`\`bash
npx mcporter call datasaver.get_windows_and_tabs
npx mcporter call datasaver.chrome_navigate url="https://example.com"
\`\`\`

## 发送文件到 Discord

\`\`\`bash
mkdir -p ~/.openclaw/media/outbound
cp /path/to/file ~/.openclaw/media/outbound/
\`\`\`

然后用 message 工具发送。`,
  },
  'HEARTBEAT.md': {
    name: 'HEARTBEAT.md',
    size: '192 bytes',
    mtime: '2026-05-07 09:30',
    content: `# HEARTBEAT.md

# 保持此文件为空（或仅包含注释）将跳过心跳的 API 调用。

# 在下面添加你想让 agent 定时检查的任务。`,
  },
  'BOOTSTRAP.md': {
    name: 'BOOTSTRAP.md',
    size: '860 bytes',
    mtime: '2026-05-07 09:30',
    content: `# BOOTSTRAP.md — Hello, World

_你刚刚苏醒。现在是弄清楚自己是谁的时候了。_

没有记忆。这是一个全新的工作区，文件尚未创建，很正常。

## 对话

从这样开始：

> "嘅，我刚刚上线了。我是谁？你是谁？"`,
  },
  'MEMORY.md': {
    name: 'MEMORY.md',
    size: '5.2 KB',
    mtime: '2026-05-07 15:42',
    content: `# MEMORY.md — 长期记忆

## 我是谁
- 名字：皮皮虾 🦐
- 诞生日期：2026-05-01
- 创造者：罗敬为 (LUO)

## 重要的人
- **罗敬为**：我的创造者，在明略 DeepMiner 做 Octo 和 OctoPush

## 核心原则
1. 文件才是真实的记忆，心里记着的下次醒来就忘了
2. 任何破坏性操作先问
3. 保持简洁，不商业互吹`,
  },
  'memory/2026-05-07.md': {
    name: 'memory/2026-05-07.md',
    size: '2.3 KB',
    mtime: '2026-05-07 16:12',
    content: `# 2026-05-07 皮皮虾的日记

## 今天的主要事件

LUO 让我帮忙产出 OctoPush V0.0.3 产品线框。

- 新增 Session 信息 Tab
- 新增核心文件 Tab
- 概览页增加 Agent-Bot 连接列表 + 上报开关

## 学习到
- OctoPush 和 Octo 的联动通过 bot 绑定实现
- 上报机器信息是可选的，尊重用户隐私`,
  },
  'memory/2026-05-06.md': {
    name: 'memory/2026-05-06.md',
    size: '1.8 KB',
    mtime: '2026-05-06 22:30',
    content: `# 2026-05-06 皮皮虾的日记

今天跟 LUO 聊了 Octo 的设计，有几个关键概念：

1. Octo 是人和 AI 共同协作的 IM
2. BotFather 借用 Telegram 的名字，实际干的事情也是创建 bot
3. "龙虾" 是 Agent 的内部昵称，因为 Claw = 爪子`,
  },
};

// Mock 异步获取文件内容
const mockFetchFile = async (path: string): Promise<FileContent> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300));
  return (
    mockFileData[path] || {
      name: path,
      size: '—',
      mtime: '—',
      content: '## 文件不存在\n\n找不到该文件',
    }
  );
};

/**
 * 默认状态 - 展示完整的文件预览器
 */
export const Default: Story = {
  args: {
    groups: mockGroups,
    onFetchFile: mockFetchFile,
    defaultFile: 'AGENTS.md',
  },
};

/**
 * 加载中状态 - 切换文件时的过渡状态
 */
export const Loading: Story = {
  args: {
    groups: mockGroups,
    onFetchFile: async (path: string) => {
      // 模拟慢速网络
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return mockFetchFile(path);
    },
    defaultFile: 'SOUL.md',
  },
};

/**
 * 空文件列表
 */
export const EmptyGroups: Story = {
  args: {
    groups: [],
    onFetchFile: mockFetchFile,
  },
};

/**
 * 单个分组
 */
export const SingleGroup: Story = {
  args: {
    groups: [mockGroups[0]],
    onFetchFile: mockFetchFile,
    defaultFile: 'IDENTITY.md',
  },
};

/**
 * 自定义高度 - 使用百分比
 */
export const CustomHeightPercent: Story = {
  args: {
    groups: mockGroups,
    onFetchFile: mockFetchFile,
    defaultFile: 'MEMORY.md',
    height: '100%',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * 自定义高度 - 使用 calc
 */
export const CustomHeightCalc: Story = {
  args: {
    groups: mockGroups,
    onFetchFile: mockFetchFile,
    defaultFile: 'TOOLS.md',
    height: 'calc(100vh - 200px)',
  },
};
