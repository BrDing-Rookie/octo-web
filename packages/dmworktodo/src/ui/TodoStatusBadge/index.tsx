import React from 'react';
import type { MatterStatus } from '../../bridge/types';
import './index.css';

export interface MatterStatusBadgeProps {
  status: MatterStatus;
  className?: string;
}

const STATUS_LABELS: Record<MatterStatus, string> = {
  open: '待处理',
  done: '已完成',
  archived: '已归档',
};

export default function MatterStatusBadge({ status, className }: MatterStatusBadgeProps) {
  return (
    <span
      className={`wk-matter-status-badge wk-matter-status-badge--${status}${className ? ` ${className}` : ''}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export { MatterStatusBadge };
