import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import OwnerEditor from './index'
import type { MatterAssignee } from '../../bridge/types'

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

const mockResolveUserName = (uid: string) => uid.slice(0, 8)

const meta: Meta<typeof OwnerEditor> = {
  title: 'Matter/OwnerEditor',
  component: OwnerEditor,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 40 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof OwnerEditor>

const mockAssignees: MatterAssignee[] = [
  { id: 'a1', matter_id: 'm1', user_id: '43e10cf1cd1e490584110a906ede665f', created_at: '' },
  { id: 'a2', matter_id: 'm1', user_id: 'd3888a398148451aabc0962f1c5ab7c7', created_at: '' },
]

const mockCandidates = [
  { uid: '43e10cf1cd1e490584110a906ede665f', name: 'Alice' },
  { uid: 'd3888a398148451aabc0962f1c5ab7c7', name: 'Bob' },
  { uid: 'e4999b409259562aabc1073g2d6bc8d8', name: 'Charlie' },
]

/**
 * 可编辑态 — 发起人视角
 */
export const EditableAsCreator: Story = {
  args: {
    assignees: mockAssignees,
    canEdit: true,
    currentUid: '43e10cf1cd1e490584110a906ede665f',
    isCreator: true,
    candidates: mockCandidates,
    onToggle: async (uid, isAssigned) => {
      console.log(`Toggle ${uid}, currently assigned: ${isAssigned}`)
    },
    renderAvatar: mockRenderAvatar,
    resolveUserName: mockResolveUserName,
  },
}

/**
 * 可编辑态 — 负责人视角（非 creator）
 */
export const EditableAsAssignee: Story = {
  args: {
    assignees: mockAssignees,
    canEdit: true,
    currentUid: 'd3888a398148451aabc0962f1c5ab7c7',
    isCreator: false,
    candidates: mockCandidates,
    onToggle: async (uid, isAssigned) => {
      console.log(`Toggle ${uid}, currently assigned: ${isAssigned}`)
    },
    renderAvatar: mockRenderAvatar,
    resolveUserName: mockResolveUserName,
  },
}

/**
 * 只读态 — 无编辑权限
 */
export const ReadOnly: Story = {
  args: {
    assignees: mockAssignees,
    canEdit: false,
    currentUid: 'some-other-uid',
    isCreator: false,
    candidates: mockCandidates,
    onToggle: async () => {},
    renderAvatar: mockRenderAvatar,
    resolveUserName: mockResolveUserName,
  },
}

/**
 * 单人负责 — 不可移除最后一位
 */
export const SingleAssignee: Story = {
  args: {
    assignees: [mockAssignees[0]],
    canEdit: true,
    currentUid: '43e10cf1cd1e490584110a906ede665f',
    isCreator: true,
    candidates: mockCandidates,
    onToggle: async (uid, isAssigned) => {
      console.log(`Toggle ${uid}, currently assigned: ${isAssigned}`)
    },
    renderAvatar: mockRenderAvatar,
    resolveUserName: mockResolveUserName,
  },
}

/**
 * 无候选成员 — 下拉只显示当前负责人
 */
export const NoCandidates: Story = {
  args: {
    assignees: mockAssignees,
    canEdit: true,
    currentUid: '43e10cf1cd1e490584110a906ede665f',
    isCreator: true,
    candidates: [],
    onToggle: async () => {},
    renderAvatar: mockRenderAvatar,
    resolveUserName: mockResolveUserName,
  },
}
