/**
 * Channel ID 工具: 处理父群 / 子区 ID 的拆解。
 *
 * WuKongIM 子区 (ChannelType=5, CommunityTopic) 的 channel_id 不是独立的群号,
 * 而是 "{父群 group_no}{SEPARATOR}{子区 short_id}" 拼接字符串,
 * 分隔符是 4 个下划线 '____'。见 dmworkim modules/thread/const.go:
 *   const ChannelIDSeparator = "____"
 *
 * 前端经常只需要父群号 (权限判断 / IM 成员校验都按父群走), 本工具统一处理。
 */

export const THREAD_CHANNEL_ID_SEPARATOR = "____";

/** 子区 channel type 对应的数字常量 (WuKongIM ChannelTypeCommunityTopic) */
export const CHANNEL_TYPE_COMMUNITY_TOPIC = 5;

/**
 * 把 (channel_id, channel_type) 归一成 "父群号"。
 *
 * - 子区 (channel_type=5): 拆 channel_id 的 '____' 取前半段作为父群号
 * - 其它类型 (群=2 / 个人=1 等): 原样返回 channel_id
 * - 无效入参: 返回空串
 *
 * 用于判断 "用户是否加入该群" 的场景 — /group/my 接口只返回群 (type=2),
 * 不返回子区。子区的权限从属于父群, 所以拿父群号去匹配。
 */
export function toParentGroupNo(
    channelId: string | undefined | null,
    channelType: number | undefined | null,
): string {
    if (!channelId) return "";
    if (channelType === CHANNEL_TYPE_COMMUNITY_TOPIC) {
        const idx = channelId.indexOf(THREAD_CHANNEL_ID_SEPARATOR);
        if (idx > 0) {
            return channelId.slice(0, idx);
        }
        // 格式不合法: 退化到原 id, 避免返回空让上层 '永远未加入'
        return channelId;
    }
    return channelId;
}

/**
 * 把子区 channel_id 拆成 { groupNo, shortId }。
 *
 * 仅适用于 channel_type=5 的情况。格式不合法时返回 null, 调用方按 "解析失败"
 * 处理 (通常是报错提示)。
 */
export function parseThreadChannelId(
    channelId: string | undefined | null,
): { groupNo: string; shortId: string } | null {
    if (!channelId) return null;
    const idx = channelId.indexOf(THREAD_CHANNEL_ID_SEPARATOR);
    if (idx <= 0) return null;
    const groupNo = channelId.slice(0, idx);
    const shortId = channelId.slice(idx + THREAD_CHANNEL_ID_SEPARATOR.length);
    if (!groupNo || !shortId) return null;
    return { groupNo, shortId };
}
