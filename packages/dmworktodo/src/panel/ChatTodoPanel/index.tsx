import React, { useState, useCallback } from 'react';
import type { Matter } from '../../bridge/types';
import { useMatterList } from '../../hooks/useTodoList';
import MatterCard from '../../ui/TodoCard';
import DetailPanel from '../../ui/DetailPanel';
import QuickAddBar from '../../ui/QuickAddBar';
import './index.css';

export interface ChatMatterPanelProps {
  channelId: string;
  channelType: number;
  channelName?: string;
  onClose: () => void;
}

type Tab = 'open' | 'done';

/**
 * ChatMatterPanel — 频道侧边任务面板（M4 重构）
 * - 两个 Tab：待处理 / 已完成
 * - 点击卡片展开 DetailPanel（原地替换列表）
 * - 底部 QuickAddBar：Enter 乐观创建，⊕ 展开完整 Modal
 */
export default function ChatMatterPanel({
  channelId,
  channelType,
  channelName,
  onClose,
}: ChatMatterPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [selectedMatterId, setSelectedTodoId] = useState<string | null>(null);

  const { matters, loading, reload, toggleStatus, addOptimistic, removeOptimistic } = useMatterList({
    initialFilters: {
      source_channel_id: channelId,
      source_channel_type: channelType,
    },
    pageSize: 100,
  });

  const openMatters = matters.filter((t) => t.status === 'open');
  const closedMatters = matters.filter((t) => t.status === 'done' || t.status === 'archived');
  const displayMatters = activeTab === 'open' ? openMatters : closedMatters;

  const handleQuickCreated = useCallback((matter: Matter) => {
    if (matter.id.startsWith('__rollback__')) {
      // 回滚：移除乐观条目，reload 拿真实数据
      removeOptimistic(matter.id.replace('__rollback__', '__optimistic__'));
      reload();
      return;
    }
    if (matter.id.startsWith('__optimistic__')) {
      // 乐观插入：立即显示在列表顶部
      addOptimistic(matter);
      return;
    }
    // 真实数据回来：移除所有乐观条目（每次只有一个），reload 拿真实列表
    removeOptimistic('__optimistic__');
    reload();
  }, [reload, addOptimistic, removeOptimistic]);

  const channel = { channelId, channelType, name: channelName };

  return (
    <div className="wk-matter-chat-panel">
      {/* Header — 详情页时隐藏，由 DetailPanel 自己的 header 接管 */}
      {!selectedMatterId && (
        <div className="wk-matter-chat-panel__header">
          <span className="wk-matter-chat-panel__title">事项</span>
          <button type="button" className="wk-matter-chat-panel__close" onClick={onClose}>✕</button>
        </div>
      )}

      {/* Tabs — 详情页时隐藏 */}
      <div className="wk-matter-chat-panel__tabs" style={selectedMatterId ? { display: 'none' } : undefined}>
        <button
          type="button"
          className={`wk-matter-chat-panel__tab${activeTab === 'open' ? ' wk-matter-chat-panel__tab--active' : ''}`}
          onClick={() => { setActiveTab('open'); setSelectedTodoId(null); }}
        >
          待处理 <span className="wk-matter-chat-panel__tab-count">{openMatters.length}</span>
        </button>
        <button
          type="button"
          className={`wk-matter-chat-panel__tab${activeTab === 'done' ? ' wk-matter-chat-panel__tab--active' : ''}`}
          onClick={() => { setActiveTab('done'); setSelectedTodoId(null); }}
        >
          已完成 <span className="wk-matter-chat-panel__tab-count">{closedMatters.length}</span>
        </button>
      </div>

      {/* Body: list or detail */}
      <div className="wk-matter-chat-panel__body">
        {selectedMatterId ? (
          <DetailPanel
            matterId={selectedMatterId}
            channel={channel}
            onClose={() => setSelectedTodoId(null)}
            onStatusChanged={reload}
            showBack
          />
        ) : (
          <>
            {loading && <div className="wk-matter-chat-panel__empty">加载中...</div>}
            {!loading && displayMatters.length === 0 && (
              <div className="wk-matter-chat-panel__empty">
                {activeTab === 'open' ? '暂无待处理事项' : '暂无已完成事项'}
              </div>
            )}
            {!loading && displayMatters.map((matter) => (
              <div key={matter.id} style={{ marginBottom: 'var(--wk-sp-1, 4px)' }}>
                <MatterCard
                  matter={matter}
                  assigneeUids={[]}
                  onClick={(id) => setSelectedTodoId(id)}
                  onStatusChange={(id) => toggleStatus(id,matter.status)}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Quick add footer */}
      <QuickAddBar
        channelId={channelId}
        channelType={channelType}
        channelName={channelName}
        onCreated={handleQuickCreated}
      />
    </div>
  );
}

export { ChatMatterPanel };
