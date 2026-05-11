import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import SidebarCard from './index'
import type { Matter } from '../../bridge/types'

const mockRenderAvatar = (uid: string, size: number) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#ccc',
      fontSize: size * 0.5,
      lineHeight: `${size}px`,
      textAlign: 'center',
      color: '#666',
    }}
  >
    {uid.slice(0, 2)}
  </span>
)

const mockRenderUserName = (uid: string) => (
  <span>{uid.slice(0, 8)}</span>
)

const meta: Meta<typeof SidebarCard> = {
  title: 'Matter/SidebarCard',
  component: SidebarCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 320, padding: 16, background: 'var(--wk-bg-base, #f5f6f7)' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SidebarCard>

const baseMatter: Matter = {
  id: '8575cfce-e60a-4ee6-a3c5-7121cd46490d',
  seq_no: 2451,
  title: 'Octo 产品策略 PPT 打磨',
  description: '完成 Octo 产品策略 PPT 的最终版本',
  status: 'open',
  creator_id: '43e10cf1cd1e490584110a906ede665f',
  deadline: '2026-05-15T23:59:59Z',
  source_channel_id: '111bcaea9ad145ca9b8fafdad50b2196',
  source_channel_type: 2,
  source_name: '产品负责人群',
  assignees: [
    { id: 'a1', matter_id: '8575cfce', user_id: '43e10cf1cd1e490584110a906ede665f', created_at: '' },
    { id: 'a2', matter_id: '8575cfce', user_id: 'd3888a398148451aabc0962f1c5ab7c7', created_at: '' },
  ],
  channels: [],
  created_at: '2026-05-10T11:39:13.773Z',
  updated_at: '2026-05-10T11:39:13.773Z',
}

/**
 * 默认态 — 进行中事项
 */
export const Default: Story = {
  args: {
    matter: baseMatter,
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
    sourceChannelName: '产品负责人群',
  },
}

/**
 * 选中态
 */
export const Selected: Story = {
  args: {
    matter: baseMatter,
    selected: true,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
    sourceChannelName: '产品负责人群',
  },
}

/**
 * 已完成状态
 */
export const Done: Story = {
  args: {
    matter: { ...baseMatter, status: 'done' },
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
  },
}

/**
 * 已归档状态
 */
export const Archived: Story = {
  args: {
    matter: { ...baseMatter, status: 'archived' },
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
  },
}

/**
 * 无 deadline
 */
export const NoDeadline: Story = {
  args: {
    matter: { ...baseMatter, deadline: undefined },
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
  },
}

/**
 * 长标题 — 测试文本截断
 */
export const LongTitle: Story = {
  args: {
    matter: {
      ...baseMatter,
      title: '这是一个非常非常长的事项标题用来测试在卡片中文本是否能正确截断和换行显示不会溢出容器',
    },
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
  },
}

/**
 * 多负责人 — 超过 3 人显示"等 N 人"
 */
export const ManyAssignees: Story = {
  args: {
    matter: {
      ...baseMatter,
      assignees: [
        { id: 'a1', matter_id: '8575cfce', user_id: 'uid1', created_at: '' },
        { id: 'a2', matter_id: '8575cfce', user_id: 'uid2', created_at: '' },
        { id: 'a3', matter_id: '8575cfce', user_id: 'uid3', created_at: '' },
        { id: 'a4', matter_id: '8575cfce', user_id: 'uid4', created_at: '' },
        { id: 'a5', matter_id: '8575cfce', user_id: 'uid5', created_at: '' },
      ],
    },
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
  },
}

/**
 * 无负责人
 */
export const NoAssignees: Story = {
  args: {
    matter: { ...baseMatter, assignees: [] },
    selected: false,
    onClick: () => {},
    renderAvatar: mockRenderAvatar,
    renderUserName: mockRenderUserName,
  },
}
