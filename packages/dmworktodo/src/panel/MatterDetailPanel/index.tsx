import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type {
  ActorKind,
  ChangelogEntry,
  ChannelDigest,
  Deliverable,
  MatterDetail,
  MatterStatus,
  TimelineKind,
} from '../../bridge/matterDetailTypes';
import { getMattersByChannelMock } from '../../bridge/matterDetailMock';
import { transitionMatter } from '../../api/todoApi';
import type { MatterStatus as ApiMatterStatus } from '../../bridge/types';
import { Toast } from '../../utils/toast';
import './index.css';

export interface MatterDetailPanelProps {
  channelId: string;
  channelType: number;
  onClose: () => void;
}

type TabKey = 'channels' | 'outputs' | 'changelog';

/**
 * MatterDetailPanel — v0.7 Matter 详情面板（V5 shape）
 *
 * 三 tab：关联群聊 / 产出文件 / 变更记录
 *
 * TODO(data): 当前 mock 一个 Matter（M-2451），后续支持切换不同 Matter
 * TODO(interaction): 收藏 / 转发 / 关联新群 / 状态切换先占位
 * TODO(a11y): tab 键盘切换 + focus 管理
 */
export default function MatterDetailPanel({ channelId, onClose }: MatterDetailPanelProps) {
  const matters = useMemo(() => getMattersByChannelMock(channelId), [channelId]);
  const matter: MatterDetail | undefined = matters[0];

  const [tab, setTab] = useState<TabKey>('channels');
  const [statusOverride, setStatusOverride] = useState<MatterStatus | null>(null);

  const handleStatusChange = useCallback(async (newStatus: MatterStatus) => {
    if (!matter) return;
    const oldStatus = statusOverride ?? matter.status;
    // 乐观更新
    setStatusOverride(newStatus);
    try {
      // 映射 v0.7 status → 后端 status（active → open）
      const apiStatus: ApiMatterStatus = newStatus === 'active' ? 'open' : newStatus;
      // TODO(backend): matter.id 目前是 mock 的 "M-2451"，真实接口需要后端 UUID
      await transitionMatter(matter.id, apiStatus);
    } catch {
      // 回滚
      setStatusOverride(oldStatus);
      Toast.error('状态修改失败');
    }
  }, [matter, statusOverride]);

  // 合并 override 到 matter
  const displayMatter = matter ? { ...matter, status: statusOverride ?? matter.status } : undefined;

  if (!displayMatter) {
    return (
      <div className="wk-mp">
        <div className="wk-mp-head">
          <div className="wk-mp-head__row1">
            <span className="wk-mp-head__id">事项</span>
            <div className="wk-mp-head__actions">
              <button type="button" className="wk-mp-head__close" onClick={onClose} aria-label="关闭">
                ✕
              </button>
            </div>
          </div>
        </div>
        <div className="wk-mp__scroll">
          <div className="wk-mp-empty">当前 channel 没有关联的事项</div>
        </div>
      </div>
    );
  }

  const tabs: { id: TabKey; label: string; count: number }[] = [
    { id: 'channels', label: '关联群聊', count: displayMatter.channelDigests.length },
    { id: 'outputs', label: '产出文件', count: displayMatter.deliverables.length },
    { id: 'changelog', label: '变更记录', count: displayMatter.changelog.length },
  ];

  return (
    <div className="wk-mp">
      <Head
        matter={displayMatter}
        onClose={onClose}
        onStatusChange={handleStatusChange}
      />
      <MainGoal matter={displayMatter} />
      <div className="wk-mp-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`wk-mp-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="wk-mp-tab__count">{t.count}</span>
          </button>
        ))}
      </div>
      <div className="wk-mp__scroll">
        {tab === 'channels' && <ChannelsTab digests={displayMatter.channelDigests} />}
        {tab === 'outputs' && <OutputsTab items={displayMatter.deliverables} />}
        {tab === 'changelog' && <ChangelogTab entries={displayMatter.changelog} />}
        <div className="wk-mp-footer-note">
          ✦ Matter 是 IM 工作的 hierarchy 任务卡 · AI 从群聊持续蒸馏 · 用户只确认，不维护
        </div>
      </div>
    </div>
  );
}

// ─── Head ────────────────────────────────────────────────
function Head({
  matter,
  onClose,
  onStatusChange,
}: {
  matter: MatterDetail;
  onClose: () => void;
  onStatusChange: (newStatus: MatterStatus) => void;
}) {
  const statusLabel: Record<MatterStatus, string> = {
    active: '进行中',
    done: '已完成',
    archived: '已归档',
  };

  return (
    <div className="wk-mp-head">
      <div className="wk-mp-head__row1">
        <span className="wk-mp-head__id">{matter.id}</span>
        <StatusPicker status={matter.status} onChange={onStatusChange} />
        {/* TODO(interaction): DdlEditor — 点击弹日期选择器 */}
        <span className="wk-mp-head__ddl">
          <span className="wk-mp-head__ddl-label">截止</span>
          <span className="wk-mp-head__ddl-value">{matter.ddl}</span>
        </span>
        <div className="wk-mp-head__actions">
          {/* TODO(interaction): 转发 — 选 channel/thread 发 Matter 卡片（PRD §13[5]） */}
          <button type="button" className="wk-mp-head__iconbtn" title="转发" aria-label="转发">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            转发
          </button>
          <button type="button" className="wk-mp-head__close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
      </div>
      <h1 className="wk-mp-head__title">{matter.title}</h1>
      <div className="wk-mp-head__creator">
        <Avatar name={matter.creator} kind="human" size="sm" />
        <span>{matter.creator}</span>
        <span className="wk-mp-head__creator-label">创建人</span>
      </div>
      {matter.owners && matter.owners.length > 0 && (
        <div className="wk-mp-head__owners">
          <span className="wk-mp-head__owners-avatars">
            {matter.owners.map((name, i) => (
              <span key={name} className="wk-mp-head__owners-avatar-wrap" style={{ zIndex: matter.owners.length - i }}>
                <Avatar name={name} kind="human" size="sm" />
              </span>
            ))}
          </span>
          <span>{matter.owners.join('、')}</span>
          <span className="wk-mp-head__creator-label">负责人</span>
        </div>
      )}
    </div>
  );
}

// ─── Main goal ────────────────────────────────────────────
function MainGoal({ matter }: { matter: MatterDetail }) {
  return (
    <div className="wk-mp-goal">
      <div className="wk-mp-goal__label">主目标</div>
      <div className="wk-mp-goal__text">{matter.mainGoal.text}</div>
    </div>
  );
}

// ─── Channels tab ────────────────────────────────────────
function ChannelsTab({ digests }: { digests: ChannelDigest[] }) {
  if (digests.length === 0) {
    return <div className="wk-mp-empty">当前没有关联的群聊</div>;
  }
  return (
    <div>
      {/* TODO(interaction): 关联新群 — 弹 LinkChannelsModal */}
      <button type="button" className="wk-mp-digest-addnew" title="关联新群">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        关联新群
      </button>
      {digests.map((d) => (
        <DigestItem key={d.channel} digest={d} />
      ))}
    </div>
  );
}

function DigestItem({ digest }: { digest: ChannelDigest }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="wk-mp-digest">
      <div className="wk-mp-digest__head">
        <span className="wk-mp-digest__channel">{digest.channel}</span>
        <span className="wk-mp-digest__sync">{digest.relativeTime}同步</span>
      </div>
      <div className="wk-mp-digest__progress">
        <div className="wk-mp-digest__progress-label">最新进展</div>
        <div className="wk-mp-digest__progress-text">{digest.summary}</div>
      </div>
      {digest.timeline.length > 0 && (
        <>
          {expanded && (
            <div className="wk-mp-timeline">
              {digest.timeline.map((ev, i) => (
                <div key={i} className="wk-mp-timeline-row">
                  <span className="wk-mp-timeline-row__time">{ev.time}</span>
                  <span className={`wk-mp-timeline-row__kind wk-mp-kind--${ev.kind}`}>
                    {kindIcon(ev.kind)} {kindLabel(ev.kind)}
                  </span>
                  <span className="wk-mp-timeline-row__text">{ev.text}</span>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="wk-mp-digest__toggle" onClick={() => setExpanded(!expanded)}>
            <span className={`wk-mp-digest__toggle-chev ${expanded ? 'is-open' : ''}`}>▾</span>
            {expanded ? '收起时间线' : '展开时间线'}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Outputs tab ─────────────────────────────────────────
function OutputsTab({ items }: { items: Deliverable[] }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? items.filter(
        (it) =>
          it.name.toLowerCase().includes(needle) ||
          (it.desc || '').toLowerCase().includes(needle) ||
          it.by.toLowerCase().includes(needle),
      )
    : items;

  if (items.length === 0) {
    return <div className="wk-mp-empty">暂无产出文件</div>;
  }

  return (
    <div>
      <div className="wk-mp-search">
        <svg
          className="wk-mp-search__icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="wk-mp-search__input"
          placeholder="搜索产出（文件名 / 描述 / 产出者）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="wk-mp-empty">没有匹配的产出</div>
      ) : (
        <div>
          {filtered.map((d) => (
            <DeliverableRow key={d.name} item={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliverableRow({ item }: { item: Deliverable }) {
  const ext = (item.name.split('.').pop() || '').toLowerCase();
  return (
    <div className="wk-mp-deliv">
      <span className={`wk-mp-deliv__glyph wk-mp-deliv__glyph--${ext}`}>{ext}</span>
      <div className="wk-mp-deliv__body">
        <div className="wk-mp-deliv__name">{item.name}</div>
        {item.desc && <div className="wk-mp-deliv__desc">{item.desc}</div>}
        <div className="wk-mp-deliv__meta">
          <span className="wk-mp-deliv__by">
            <Avatar name={item.by} kind={item.byKind} size="sm" />
            <span>{item.by}</span>
            {item.byKind === 'agent' && <span className="wk-mp-deliv__agent-tag">Agent</span>}
          </span>
          <span>·</span>
          <span className="wk-mp-deliv__time">{item.time}</span>
          {item.size && (
            <>
              <span>·</span>
              <span>{item.size}</span>
            </>
          )}
          {item.version && (
            <>
              <span>·</span>
              <span>{item.version}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Changelog tab ───────────────────────────────────────
const CHANGE_TYPE_LABELS: Record<string, string> = {
  create: '创建',
  goal_change: '目标变更',
  title_change: '标题变更',
  ddl_change: 'DDL 变更',
  status_change: '状态变更',
  channel_change: '关联群变更',
};

function ChangelogTab({ entries }: { entries: ChangelogEntry[] }) {
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const sorted = order === 'desc' ? [...entries].reverse() : entries;
  if (entries.length === 0) {
    return <div className="wk-mp-empty">暂无变更记录</div>;
  }
  return (
    <div>
      <div className="wk-mp-changelog-toolbar">
        <button
          type="button"
          className={`wk-mp-changelog-order ${order === 'desc' ? 'is-active' : ''}`}
          onClick={() => setOrder('desc')}
        >
          最新在上
        </button>
        <button
          type="button"
          className={`wk-mp-changelog-order ${order === 'asc' ? 'is-active' : ''}`}
          onClick={() => setOrder('asc')}
        >
          最旧在上
        </button>
      </div>
      <div>
        {sorted.map((ev, i) => (
          <ChangelogRow key={i} ev={ev} />
        ))}
      </div>
    </div>
  );
}

function ChangelogRow({ ev }: { ev: ChangelogEntry }) {
  const isGoal = ev.type === 'goal_change';
  const label = CHANGE_TYPE_LABELS[ev.type] || ev.type;

  let content: React.ReactNode = null;
  if (ev.type === 'create') {
    content = (
      <span>
        初始 DDL <span className="wk-mp-mono wk-mp-diff-after">{ev.initialDDL}</span>
      </span>
    );
  } else if (ev.type === 'goal_change') {
    content = (
      <div>
        {ev.added?.map((t, i) => (
          <div key={`a-${i}`} className="wk-mp-diff-add">
            <span className="wk-mp-diff-add__sign">+</span>
            <span>"{t}"</span>
          </div>
        ))}
        {ev.removed?.map((t, i) => (
          <div key={`r-${i}`} className="wk-mp-diff-remove">
            <span className="wk-mp-diff-remove__sign">−</span>
            <span className="wk-mp-diff-remove__text">"{t}"</span>
          </div>
        ))}
      </div>
    );
  } else if (ev.type === 'title_change' || ev.type === 'ddl_change' || ev.type === 'status_change') {
    content = (
      <span>
        <span className="wk-mp-diff-before">{ev.before}</span>
        <span className="wk-mp-diff-arrow">→</span>
        <span className="wk-mp-diff-after">{ev.after}</span>
      </span>
    );
  } else if (ev.type === 'channel_change') {
    content = (
      <div>
        {ev.added?.map((c, i) => (
          <div key={`ca-${i}`} className="wk-mp-diff-add">
            <span className="wk-mp-diff-add__sign">+</span>
            <span className="wk-mp-mono">{c}</span>
          </div>
        ))}
        {ev.removed?.map((c, i) => (
          <div key={`cr-${i}`} className="wk-mp-diff-remove">
            <span className="wk-mp-diff-remove__sign">−</span>
            <span className="wk-mp-mono wk-mp-diff-remove__text">{c}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`wk-mp-clog ${isGoal ? 'wk-mp-clog--goal' : ''}`}>
      <span className="wk-mp-clog__time">{ev.time}</span>
      <span className="wk-mp-clog__type">{label}</span>
      <div className="wk-mp-clog__content">{content}</div>
      <div className="wk-mp-clog__actor">
        <Avatar name={ev.actor} kind="human" size="sm" />
        <span>{ev.actor}</span>
        {ev.from && (
          <>
            <span>·</span>
            <span className="wk-mp-clog__actor-channel">{ev.from}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── StatusPicker（点击状态徽章弹出下拉切换） ─────────────
const STATUS_OPTIONS: Array<{ id: MatterStatus; label: string; desc: string }> = [
  { id: 'active', label: '进行中', desc: '推进中' },
  { id: 'done', label: '已完成', desc: '已交付' },
  { id: 'archived', label: '已归档', desc: '只发起人可见' },
];

function StatusPicker({
  status,
  onChange,
}: {
  status: MatterStatus;
  onChange: (newStatus: MatterStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const statusLabel: Record<MatterStatus, string> = {
    active: '进行中',
    done: '已完成',
    archived: '已归档',
  };

  return (
    <span ref={ref} className="wk-mp-status-picker">
      <button
        type="button"
        className={`wk-mp-head__status wk-mp-head__status--${status}`}
        onClick={() => setOpen((o) => !o)}
        title="点击修改状态"
      >
        <span className="wk-mp-head__status-dot" />
        {statusLabel[status]}
      </button>
      {open && (
        <div className="wk-mp-status-picker__dropdown">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`wk-mp-status-picker__option${o.id === status ? ' is-active' : ''}`}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              <span className={`wk-mp-head__status wk-mp-head__status--${o.id}`}>
                <span className="wk-mp-head__status-dot" />
                {o.label}
              </span>
              <span className="wk-mp-status-picker__desc">{o.desc}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

// ─── Small atoms ─────────────────────────────────────────
function Avatar({
  name,
  kind,
  size = 'md',
}: {
  name: string;
  kind: ActorKind;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cls = `wk-mp-avatar ${kind === 'agent' ? 'wk-mp-avatar--agent' : ''} ${
    size === 'md' ? 'wk-mp-avatar--md' : size === 'lg' ? 'wk-mp-avatar--lg' : ''
  }`;
  const initial = name.charAt(0).toUpperCase();
  return <span className={cls}>{initial}</span>;
}

function kindLabel(k: TimelineKind): string {
  switch (k) {
    case 'create':
      return '创建';
    case 'decision':
      return '决策';
    case 'output':
      return '产出';
    case 'blocker':
      return '阻塞';
    case 'unblock':
      return '解除';
    case 'conflict':
      return '变更';
    default:
      return '';
  }
}

function kindIcon(k: TimelineKind): string {
  switch (k) {
    case 'create':
      return '+';
    case 'decision':
      return '✓';
    case 'output':
      return '⊙';
    case 'blocker':
      return '⊘';
    case 'unblock':
      return '↗';
    case 'conflict':
      return '!';
    default:
      return '·';
  }
}

export { MatterDetailPanel };
