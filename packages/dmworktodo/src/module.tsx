import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { WKApp, Menus, ChannelTypeCommunityTopic } from '@octo/base';
import type { IModule, ConversationContext } from '@octo/base';
import { ChannelTypeGroup } from 'wukongimjssdk';
import WKSDK from 'wukongimjssdk';
import MatterPage from './pages/TodoPage';
import ChatMatterPanel from './panel/ChatTodoPanel';
import MatterDetailPanel from './panel/MatterDetailPanel';
import MatterLinkMenu from './ui/MatterLinkMenu';
import { createMatter } from './api/todoApi';
import { Toast } from './utils/toast';
import CreateTaskModal from './ui/CreateTaskModal';
import './ui/tokens.css';

export type OpenCreateTaskPayload = {
  channelId: string;
  channelType: number;
  channelName?: string;
  prefillTitle?: string;
  prefillAssigneeUids?: string[];
  /** If true, clear the input box after creating the task */
  clearOnConfirm?: boolean;
};

/** 解析 @[uid:name] 格式，返回纯文本 title 和 uid 列表 */
function parseMentionText(raw: string): { title: string; uids: string[] } {
  const uids: string[] = [];
  const title = raw.replace(/@\[([^:]+):([^\]]+)\]/g, (_match, uid, name) => {
    if (uid !== '-1') uids.push(uid);
    return uid === '-1' ? '@所有人' : `@${name}`;
  });
  return { title: title.trim(), uids: [...new Set(uids)] };
}



/** Guard against double-init (HMR in dev or future module lifecycle changes). */
let _initialized = false;

// Reset on HMR: tear down old listeners, reset init guard.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _initialized = false;
    // Properly unmount React root before removing DOM node
    _globalTodoModalRoot?.unmount();
    _globalTodoModalRoot = null;
    const el = document.getElementById('matter-global-modal-root');
    if (el) el.remove();
    _globalTodoModalMounted = false;
  });
}

/**
 * Placeholder Matter icon for the NavRail.
 */
function MatterIcon({ active }: { active?: boolean }) {
  const color = active ? 'var(--wk-brand-primary, #7C5CFC)' : 'currentColor';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

/**
 * Small check-square icon for the chat toolbar button.
 */
function CheckSquareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

/**
 * Checklist icon for chat header (medium size).
 */
function ChecklistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

/**
 * MatterModule — registers the Matter feature into Octo web.
 */
export default class MatterModule implements IModule {
  id(): string {
    return 'MatterModule';
  }

  init(): void {
    // Prevent duplicate listeners on HMR / double-init
    if (_initialized) return;
    _initialized = true;

    // Register route
    WKApp.route.register('/matter', () => <MatterPage />);

    // Register NavRail menu item (sort=4001, after contacts=4000)
    WKApp.menus.register(
      'matter',
      () => {
        const m = new Menus(
          'matter',
          '/matter',
          '事项',
          <MatterIcon />,
          <MatterIcon active />,
        );
        return m;
      },
      4001,
    );

    // Mount global CreateTaskModal portal (handles Alt+Enter from any conversation)
    mountGlobalMatterModal();
    // Mount global MatterLinkMenu portal (handles "添加到事项" button from MultiplePanel)
    mountGlobalMatterLinkMenu();

    // Chat integration
    this.registerChatContextMenu();
    this.registerChatToolbar();
    this.registerChatMatterPanel();
    this.registerChatHeaderIcon();
  }

  /**
   * Register "Create Matter" in message context menu (right-click).
   * Only shows in group and thread channels.
   * Uses WKApp.endpoints.registerMessageContextMenus directly — the handler
   * returns a plain object with title + onClick (no need to import MessageContextMenus class).
   */
  private registerChatContextMenu(): void {
    WKApp.endpoints.registerMessageContextMenus(
      'contextmenus.createMatter',
      (message) => {
        const ct = message.channel.channelType;
        if (ct !== ChannelTypeGroup && ct !== ChannelTypeCommunityTopic) {
          return null;
        }
        return {
          title: '创建事项',
          onClick: () => {
            // 优先用编辑后的内容（remoteExtra.contentEdit），fallback 到原始 conversationDigest
            const remoteExtra = message.remoteExtra as { isEdit?: boolean; contentEdit?: { conversationDigest?: string } } | undefined;
            const effectiveContent = (remoteExtra?.isEdit && remoteExtra?.contentEdit)
              ? remoteExtra.contentEdit as { conversationDigest?: string }
              : message.content as { conversationDigest?: string };
            // 先解析再截断，避免 200 字符截断位置落在 @[uid:name] 占位符中间
            const raw = effectiveContent.conversationDigest ?? '';
            const { title: parsedTitle } = parseMentionText(raw);
            const prefillTitle = parsedTitle.slice(0, 200);
            const channelInfo = WKSDK.shared().channelManager.getChannelInfo(message.channel);
            WKApp.mittBus.emit('wk:open-create-matter-modal', {
              channelId: message.channel.channelID,
              channelType: ct,
              channelName: channelInfo?.title,
              prefillTitle,
            });
          },
        };
      },
      6000,
    );
  }

  /**
   * Register matter toggle button in the chat toolbar.
   * Only visible in group and topic channels.
   * Clicking opens CreateTaskModal with prefilled title (from input box) and channel info.
   */
  private registerChatToolbar(): void {
    WKApp.endpoints.registerChatToolbar(
      'chattoolbar.matter',
      (ctx) => {
        const channel = ctx.channel();
        // Only show in group and topic channels
        if (channel.channelType !== ChannelTypeGroup && channel.channelType !== ChannelTypeCommunityTopic) {
          return undefined;
        }
        return <ChatToolbarTodoButton ctx={ctx} />;
      },
    );
  }

  /**
   * Register ChatMatterPanel in the right sidebar (mutually exclusive with thread panel).
   */
  private registerChatMatterPanel(): void {
    WKApp.endpoints.registerChatMatterPanel(
      'chatmatterpanel',
      ({ channel, onClose }) => {
        if (channel.channelType !== ChannelTypeGroup && channel.channelType !== ChannelTypeCommunityTopic) {
          return undefined;
        }
        return (
          <ChatMatterPanel
            channelId={channel.channelID}
            channelType={channel.channelType}
            onClose={onClose}
          />
        );
      }
    );
  }

  /**
   * Register matter icon in chat header (right side).
   * 点击打开事项列表面板（ChatMatterPanel）。
   */
  private registerChatHeaderIcon(): void {
    WKApp.endpoints.registerChannelHeaderRightItem(
      'channelheader.matter',
      ({ channel }) => {
        // Only show in group and topic channels
        if (channel.channelType !== ChannelTypeGroup && channel.channelType !== ChannelTypeCommunityTopic) {
          return undefined;
        }
        return (
          <div
            key="matter-icon"
            onClick={(e) => {
              e.stopPropagation();
              WKApp.mittBus.emit('wk:toggle-matter-panel', {
                channelId: channel.channelID,
                channelType: channel.channelType,
              });
            }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="事项"
          >
            <ChecklistIcon />
          </div>
        );
      },
      5000, // sort order
    );
  }

}

/**
 * Chat toolbar Matter button.
 * Emits 'wk:open-create-matter-modal' — handled by GlobalMatterModal.
 */
function ChatToolbarTodoButton({ ctx }: { ctx: ConversationContext }) {
  const channel = ctx.channel();
  const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);

  const handleOpen = () => {
    const inputCtx = ctx.messageInputContext();
    const rawText = (inputCtx?.text() ?? '').trim().slice(0, 500);
    const { title: prefillTitle, uids: prefillAssigneeUids } = parseMentionText(rawText);
    const payload: OpenCreateTaskPayload = {
      channelId: channel.channelID,
      channelType: channel.channelType,
      channelName: channelInfo?.title,
      prefillTitle,
      prefillAssigneeUids,
      clearOnConfirm: true,
    };
    WKApp.mittBus.emit('wk:open-create-matter-modal', payload);
  };

  return (
    <div
      title="创建事项"
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onClick={handleOpen}
    >
      <CheckSquareIcon />
    </div>
  );
}

/**
 * Global CreateTaskModal driven by mittBus 'wk:open-create-matter-modal'.
 * Mounted once at module init — handles Alt+Enter from any conversation.
 */
let _globalTodoModalMounted = false;
let _globalTodoModalRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;

function mountGlobalMatterModal() {
  if (_globalTodoModalMounted) return;
  _globalTodoModalMounted = true;
  const container = document.createElement('div');
  container.id = 'matter-global-modal-root';
  document.body.appendChild(container);
  _globalTodoModalRoot = ReactDOM.createRoot(container);
  _globalTodoModalRoot.render(<GlobalMatterModal />);
}

function GlobalMatterModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<OpenCreateTaskPayload | null>(null);

  useEffect(() => {
    const handler = (data: OpenCreateTaskPayload) => {
      // Parse mention placeholders in prefillTitle if not already parsed
      if (data.prefillTitle && data.prefillTitle.includes('@[')) {
        const { title, uids } = parseMentionText(data.prefillTitle);
        data = { ...data, prefillTitle: title.slice(0, 200), prefillAssigneeUids: uids };
      } else if (data.prefillTitle) {
        data = { ...data, prefillTitle: data.prefillTitle.slice(0, 200) };
      }
      setPayload(data);
      setOpen(true);
    };
    WKApp.mittBus.on('wk:open-create-matter-modal', handler);
    return () => {
      WKApp.mittBus.off('wk:open-create-matter-modal', handler);
    };
  }, []);

  if (!open || !payload) return null;

  const handleClose = () => setOpen(false);
  const handleDirtyClose = () => {
    if (window.confirm('有未保存的修改，确定放弃？')) setOpen(false);
  };

  const handleConfirm = async (req: Parameters<typeof createMatter>[0]) => {
    try {
      await createMatter(req);
    } catch (e) {
      Toast.error('创建事项失败');
      throw e; // re-throw 让 CreateTaskModal 保持打开
    }
    // Send input content (with mention) + clear when triggered from toolbar / Alt+Enter
    // 只在有预填文本时才发送（prefillTitle 非空 = 用户从输入框触发），纯附件场景不发消息
    if (payload?.clearOnConfirm && payload.channelId && payload.prefillTitle) {
      WKApp.mittBus.emit('wk:matter-created-from-input', {
        channelId: payload.channelId,
        channelType: payload.channelType,
      });
    }
    Toast.success('事项已创建');
    setOpen(false);
  };

  return (
    <CreateTaskModal
      visible={open}
      onClose={handleClose}
      onDirtyClose={handleDirtyClose}
      onConfirm={handleConfirm}
      prefillTitle={payload.prefillTitle}
      prefillAssigneeUids={payload.prefillAssigneeUids}
      sendOnConfirm={!!payload.clearOnConfirm && !!payload.prefillTitle}
      channel={payload.channelId ? {
        channelId: payload.channelId,
        channelType: payload.channelType,
        name: payload.channelName,
      } : undefined}
    />
  );
}

/**
 * Global MatterLinkMenu — 多选"添加到事项"弹出菜单
 *
 * 由 Conversation MultiplePanel 的"添加到事项"按钮通过 mitt 事件
 * 'wk:open-matter-link-menu' 触发。
 *
 * 为什么不直接在 MultiplePanel 里渲染：
 *   - dmworkbase 不应直接依赖 dmworktodo（循环依赖）
 *   - MultiplePanel 的父容器带 transform，fixed 子元素会被劫持
 *   - 通过全局 portal 挂在 body 下，定位稳定、模块解耦
 */
let _globalMatterLinkMenuMounted = false;
let _globalMatterLinkMenuRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _globalMatterLinkMenuRoot?.unmount();
    _globalMatterLinkMenuRoot = null;
    const el = document.getElementById('matter-link-menu-root');
    if (el) el.remove();
    _globalMatterLinkMenuMounted = false;
  });
}

function mountGlobalMatterLinkMenu() {
  if (_globalMatterLinkMenuMounted) return;
  _globalMatterLinkMenuMounted = true;
  const container = document.createElement('div');
  container.id = 'matter-link-menu-root';
  document.body.appendChild(container);
  _globalMatterLinkMenuRoot = ReactDOM.createRoot(container);
  _globalMatterLinkMenuRoot.render(<GlobalMatterLinkMenu />);
}

function GlobalMatterLinkMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);

  // 用 ref 挂 anchor，同时用 state 触发 re-render
  React.useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  useEffect(() => {
    const handler = (data: { anchor: HTMLElement }) => {
      // 切换：同一 anchor 再次点击则关闭
      setAnchor((prev) => (prev === data.anchor ? null : data.anchor));
    };
    WKApp.mittBus.on('wk:open-matter-link-menu', handler);
    return () => {
      WKApp.mittBus.off('wk:open-matter-link-menu', handler);
    };
  }, []);

  if (!anchor) return null;

  return (
    <MatterLinkMenu
      anchorRef={anchorRef}
      onClose={() => setAnchor(null)}
      // onCreate / onPick 暂未接入 — 占位阶段所有选项 disabled
      disabled
    />
  );
}
