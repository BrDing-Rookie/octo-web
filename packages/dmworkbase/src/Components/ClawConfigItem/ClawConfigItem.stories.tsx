import type { Meta, StoryObj } from "@storybook/react";
import ClawConfigItem from "./ClawConfigItem";
import {
    Monitor,
    Cpu,
    HardDrive,
    FolderOpen,
    Package,
    Activity,
    Globe,
    Users,
} from "lucide-react";

const meta = {
    title: "Components/ClawConfigItem",
    component: ClawConfigItem,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
        icon: {
            description: "lucide-react icon component",
            control: false,
        },
        label: {
            description: "配置项标签",
            control: "text",
        },
        value: {
            description: "配置项值",
            control: "text",
        },
    },
} satisfies Meta<typeof ClawConfigItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 基础用法 - 系统版本
 */
export const SystemVersion: Story = {
    args: {
        icon: <Monitor />,
        label: "系统版本",
        value: "macOS 13.2.1",
    },
};

/**
 * 处理器架构
 */
export const Architecture: Story = {
    args: {
        icon: <Cpu />,
        label: "处理器架构",
        value: "arm64",
    },
};

/**
 * 磁盘空间
 */
export const DiskSpace: Story = {
    args: {
        icon: <HardDrive />,
        label: "可写磁盘空间",
        value: "68.0 GB",
    },
};

/**
 * 应用数据目录
 */
export const DataDirectory: Story = {
    args: {
        icon: <FolderOpen />,
        label: "应用数据目录",
        value: ".octopush/octopush-58d651",
    },
};

/**
 * 安装版本
 */
export const ClawVersion: Story = {
    args: {
        icon: <Package />,
        label: "Claw 安装版本",
        value: "v2026.4.11",
    },
};

/**
 * 使用端口
 */
export const Port: Story = {
    args: {
        icon: <Activity />,
        label: "使用端口",
        value: "60418",
    },
};

/**
 * 后台地址
 */
export const BackendURL: Story = {
    args: {
        icon: <Globe />,
        label: "后台地址",
        value: "http://localhost:3100",
    },
};

/**
 * 积分来源团队
 */
export const Team: Story = {
    args: {
        icon: <Users />,
        label: "积分来源团队",
        value: "DeepMiner Team",
    },
};

/**
 * 多个 ConfigItem 组合展示（栅格布局）
 */
export const GridLayout: Story = {
    render: () => (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "24px",
                padding: "24px",
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid rgba(0,0,0,0.08)",
            }}
        >
            <ClawConfigItem icon={<Monitor />} label="系统版本" value="macOS 13.2.1" />
            <ClawConfigItem icon={<Cpu />} label="处理器架构" value="arm64" />
            <ClawConfigItem icon={<HardDrive />} label="可写磁盘空间" value="68.0 GB" />
            <ClawConfigItem icon={<FolderOpen />} label="应用数据目录" value=".octopush/octopush-58d651" />
            <ClawConfigItem icon={<Package />} label="Claw 安装版本" value="v2026.4.11" />
            <ClawConfigItem icon={<Activity />} label="使用端口" value="60418" />
            <ClawConfigItem icon={<Globe />} label="后台地址" value="http://localhost:3100" />
            <ClawConfigItem icon={<Users />} label="积分来源团队" value="DeepMiner Team" />
        </div>
    ),
};

/**
 * 长文本值
 */
export const LongValue: Story = {
    args: {
        icon: <FolderOpen />,
        label: "应用数据目录",
        value: "/Users/peace/Library/Application Support/octopush/octopush-58d651",
    },
};

/**
 * 短文本值
 */
export const ShortValue: Story = {
    args: {
        icon: <Activity />,
        label: "使用端口",
        value: "3100",
    },
};
