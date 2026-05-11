import React from "react";
import type { Matter } from "../../bridge/types";
import "./index.css";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  open: { label: "进行中", className: "wk-mp-sidebar-card__status--active" },
  done: { label: "已完成", className: "wk-mp-sidebar-card__status--done" },
  archived: {
    label: "已归档",
    className: "wk-mp-sidebar-card__status--archived",
  },
};

function formatDdl(deadline?: string): string {
  if (!deadline) return "";
  const d = new Date(deadline);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export interface SidebarCardProps {
  matter: Matter;
  selected: boolean;
  onClick: () => void;
  /** Render an avatar for the given uid at the given pixel size */
  renderAvatar: (uid: string, size: number) => React.ReactNode;
  /** Render a user name inline for the given uid */
  renderUserName: (uid: string) => React.ReactNode;
  /** Pre-resolved source channel name (replaces internal useChannelName call) */
  sourceChannelName?: string;
}

export default function SidebarCard({
  matter,
  selected,
  onClick,
  renderAvatar,
  renderUserName,
  sourceChannelName,
}: SidebarCardProps) {
  const status = STATUS_MAP[matter.status] || STATUS_MAP.open;
  const ddl = formatDdl(matter.deadline);
  const displaySourceName = sourceChannelName || matter.source_name;

  return (
    <button
      type="button"
      className={`wk-mp-sidebar-card${selected ? " is-selected" : ""}`}
      onClick={onClick}
    >
      <div className="wk-mp-sidebar-card__row1">
        <span className="wk-mp-sidebar-card__id">
          {matter.seq_no ? `M-${matter.seq_no}` : matter.id.slice(0, 8)}
        </span>
        <span className={`wk-mp-sidebar-card__status ${status.className}`}>
          <span className="wk-mp-sidebar-card__status-dot" />
          {status.label}
        </span>
        {ddl && <span className="wk-mp-sidebar-card__ddl">DDL {ddl}</span>}
      </div>
      <div className="wk-mp-sidebar-card__title">{matter.title}</div>
      <div className="wk-mp-sidebar-card__meta">
        <span className="wk-mp-sidebar-card__creator">
          {renderAvatar(matter.creator_id, 14)}
          {renderUserName(matter.creator_id)}
        </span>
        <span className="wk-mp-sidebar-card__meta-label">创建</span>
        {matter.source_channel_id && displaySourceName && (
          <>
            <span className="wk-mp-sidebar-card__sep">·</span>
            <span className="wk-mp-sidebar-card__channel">
              #{displaySourceName}
            </span>
          </>
        )}
      </div>
      {matter.assignees && matter.assignees.length > 0 && (
        <div className="wk-mp-sidebar-card__owners">
          <span className="wk-mp-sidebar-card__owners-avatars">
            {matter.assignees.slice(0, 3).map((a, i) => (
              <span
                key={a.user_id}
                style={{ marginLeft: i > 0 ? -5 : 0, zIndex: 3 - i }}
              >
                {renderAvatar(a.user_id, 14)}
              </span>
            ))}
          </span>
          <span className="wk-mp-sidebar-card__owners-names">
            {matter.assignees.slice(0, 3).map((a, i) => (
              <React.Fragment key={a.user_id}>
                {i > 0 && "、"}
                {renderUserName(a.user_id)}
              </React.Fragment>
            ))}
            {matter.assignees.length > 3 && (
              <span className="wk-mp-sidebar-card__owners-more">
                {" "}等 {matter.assignees.length} 人
              </span>
            )}
          </span>
          <span className="wk-mp-sidebar-card__owners-label">负责</span>
        </div>
      )}
    </button>
  );
}

export { SidebarCard };
