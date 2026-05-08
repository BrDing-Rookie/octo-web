import React from "react";
import "./ClawConfigItem.css";

export interface ClawConfigItemProps {
    /** lucide-react icon component */
    icon: React.ReactNode;
    /** 配置项标签（例如"系统版本"） */
    label: string;
    /** 配置项值（例如"macOS 13.2.1"） */
    value: string;
}

/**
 * ClawConfigItem - 单个配置信息展示组件
 * 
 * 用于展示 OpenClaw 配置信息，左侧图标 + 右侧垂直布局（标签在上、值在下）
 * 
 * @example
 * ```tsx
 * import { Monitor } from 'lucide-react';
 * 
 * <ClawConfigItem
 *   icon={<Monitor />}
 *   label="系统版本"
 *   value="macOS 13.2.1"
 * />
 * ```
 */
export default function ClawConfigItem({ icon, label, value }: ClawConfigItemProps) {
    return (
        <div className="wk-config-item" data-testid="claw-config-item">
            <div className="wk-config-item__icon" data-testid="claw-config-item-icon">
                {icon}
            </div>
            <div className="wk-config-item__content">
                <div className="wk-config-item__label" data-testid="claw-config-item-label">
                    {label}
                </div>
                <div className="wk-config-item__value" data-testid="claw-config-item-value">
                    {value}
                </div>
            </div>
        </div>
    );
}
