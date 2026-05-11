import { useState, useEffect } from 'react';
import WKSDK, { Channel } from 'wukongimjssdk';
import type { ChannelInfo } from 'wukongimjssdk';

/**
 * Resolve a (channelId, channelType) to a display name via WKSDK channel info.
 *
 * 使用场景: 历史数据里 Matter.source_name 为 NULL 时, 拿 source_channel_id
 * 反查群名, 不再显示空白。跟 useUserName 同构, 只是 channelType 不再写死为 Person。
 *
 * Returns:
 *   - 命中缓存: 直接返回 title
 *   - 未命中: 触发异步 fetch, 同时订阅 channelInfo listener, 拿到后重渲染
 *   - fetch 失败 / channelId 为空: fallback 返回空串 (调用方可以加 "未知群聊" 兜底)
 */
export function useChannelName(
    channelId: string | undefined | null,
    channelType: number | undefined | null,
): string {
    const [name, setName] = useState<string>(() => {
        if (!channelId || !channelType) return '';
        const info = WKSDK.shared().channelManager.getChannelInfo(
            new Channel(channelId, channelType),
        );
        return info?.title || '';
    });

    useEffect(() => {
        if (!channelId || !channelType) {
            setName('');
            return;
        }
        let aborted = false;

        const channel = new Channel(channelId, channelType);
        const cached = WKSDK.shared().channelManager.getChannelInfo(channel);
        if (cached?.title) {
            setName(cached.title);
            return;
        }

        const listener = (channelInfo: ChannelInfo) => {
            if (
                !aborted &&
                channelInfo.channel.channelID === channelId &&
                channelInfo.channel.channelType === channelType
            ) {
                setName(channelInfo.title || '');
            }
        };

        WKSDK.shared().channelManager.addListener(listener);
        WKSDK.shared().channelManager.fetchChannelInfo(channel).catch(() => {
            // fetch 失败不 fallback 到 channelId; 调用方视觉上 "#{xxx...}" 不友好,
            // 保持空串让上层决定显示 "未知群聊" 或隐藏整块
        });

        return () => {
            aborted = true;
            WKSDK.shared().channelManager.removeListener(listener);
        };
    }, [channelId, channelType]);

    return name;
}
