import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * YUJ-387 P1-1 — bridge 层实名徽章分支判定单测。
 *
 * 背景：
 *   YUJ-379 PR#1170 在 bridge/message/useMessageRow.ts 的 getMessageRow 里
 *   引入了「实名徽章」判断分支：
 *     1. 群成员 orgData.realname_verified → isRealnameVerified=true
 *     2. 群成员 orgData 缺失 → 回落 Person channelInfo.orgData
 *     3. bot 发送者（channelInfo.orgData.robot=1）→ 无论 realname_verified
 *        如何，一律压制为 false
 *
 *   ReviewBot YUJ-383 指出：UI 集成测试（MessageRow.test.tsx）只覆盖
 *   props 透传，拦不住 bridge 层的跨层 regression（比如有人「顺手」把
 *   fallback 顺序反过来，或把 bot 压制忘了）。这个文件就是在 bridge 层
 *   把 3 条分支钉死，任何回归直接红。
 */

const mockState = vi.hoisted(() => ({
    subscribesByChannel: new Map<string, any[]>(),
    channelInfoByUID: new Map<string, any>(),
    currentSpaceId: "",
}))

vi.mock("../../../App", () => ({
    default: {
        shared: {
            get currentSpaceId() {
                return mockState.currentSpaceId
            },
            avatarUser: (uid: string) => `avatar://${uid}`,
        },
    },
}))

vi.mock("wukongimjssdk", async () => {
    const actual: any = await vi.importActual("wukongimjssdk")
    const sharedStub = {
        channelManager: {
            getChannelInfo: (ch: any) =>
                mockState.channelInfoByUID.get(ch.channelID),
            getSubscribes: (ch: any) =>
                mockState.subscribesByChannel.get(ch.channelID) || [],
        },
    }
    const stub = { shared: () => sharedStub }
    return {
        ...actual,
        // wukongimjssdk 同时暴露 default + named export `WKSDK`，
        // useMessageRow.ts 用 default import，所以 mock 两侧都要覆盖。
        default: stub,
        WKSDK: stub,
    }
})

import { getMessageRow } from "../useMessageRow"
import { Channel, ChannelTypeGroup, ChannelTypePerson } from "wukongimjssdk"

function makeGroupMessage(opts: {
    fromUID: string
    groupID: string
}): any {
    const channel = new Channel(opts.groupID, ChannelTypeGroup)
    return {
        send: false,
        fromUID: opts.fromUID,
        channel,
        preMessage: undefined,
        timestamp: 1715000000,
        revoke: false,
        message: { remoteExtra: {} },
        fromHomeSpaceId: undefined,
        fromHomeSpaceName: undefined,
        fromIsExternal: false,
        fromSourceSpaceName: undefined,
    }
}

describe("getMessageRow — realname badge branch logic (YUJ-387 P1-1 / YUJ-379)", () => {
    beforeEach(() => {
        mockState.subscribesByChannel.clear()
        mockState.channelInfoByUID.clear()
        mockState.currentSpaceId = ""
    })

    it("branch 1: 群成员 orgData.realname_verified=true → isRealnameVerified=true (primary path)", () => {
        // 群消息场景：subscriber 列表里命中 fromUID，orgData 标记已实名
        mockState.subscribesByChannel.set("g_alpha", [
            {
                uid: "u_alice",
                name: "alice",
                remark: "",
                orgData: { real_name: "Alice Wang", realname_verified: true },
            },
        ])
        // channelInfo 缺失 / 不影响分支判定
        const row = getMessageRow(
            makeGroupMessage({ fromUID: "u_alice", groupID: "g_alpha" })
        )
        expect(row.isRealnameVerified).toBe(true)
        // 顺带验证名称走群成员路径（remark 空 → real_name，因为已 verified）
        expect(row.senderName).toBe("Alice Wang")
        expect(row.isBot).toBe(false)
    })

    it("branch 2: 群成员 orgData 缺失 + Person channelInfo.orgData.realname_verified=true → fallback → true", () => {
        // 群成员列表里没这个 uid（分页外 / 时序尚未到达），
        // Person channelInfo 有并标记实名，应回落并判 true。
        mockState.subscribesByChannel.set("g_beta", []) // 无命中
        mockState.channelInfoByUID.set("u_bob", {
            channel: new Channel("u_bob", ChannelTypePerson),
            title: "bob_nick",
            orgData: {
                realname_verified: true,
                real_name: "Bob Li",
                displayName: "Bob Li",
            },
        })
        const row = getMessageRow(
            makeGroupMessage({ fromUID: "u_bob", groupID: "g_beta" })
        )
        expect(row.isRealnameVerified).toBe(true)
        // 群成员未命中时 senderName 走 channelInfo displayName 路径
        expect(row.senderName).toBe("Bob Li")
    })

    it("branch 3: bot sender (channelInfo.orgData.robot=1) → 一律 false，不管 realname_verified 和群成员 orgData", () => {
        // 即使 Person channelInfo 与群成员 orgData 都声称已实名，bot 也必须压制
        mockState.subscribesByChannel.set("g_gamma", [
            {
                uid: "u_botty",
                name: "GPT-Boy",
                orgData: { realname_verified: true, real_name: "Fake Human" },
            },
        ])
        mockState.channelInfoByUID.set("u_botty", {
            channel: new Channel("u_botty", ChannelTypePerson),
            title: "GPT-Boy",
            orgData: {
                realname_verified: true,
                real_name: "Fake Human",
                robot: 1, // ← 关键：bot 标识
                displayName: "GPT-Boy",
            },
        })
        const row = getMessageRow(
            makeGroupMessage({ fromUID: "u_botty", groupID: "g_gamma" })
        )
        expect(row.isBot).toBe(true)
        expect(row.isRealnameVerified).toBe(false)
    })

    it("regression guard: 未实名 + 非 bot → false（字段全缺 / false 都走此分支）", () => {
        // 群成员 orgData 存在但 realname_verified=false；channelInfo 无 orgData。
        // 不应误渲染徽章。
        mockState.subscribesByChannel.set("g_delta", [
            {
                uid: "u_plain",
                name: "plain_user",
                orgData: { realname_verified: false },
            },
        ])
        const row = getMessageRow(
            makeGroupMessage({ fromUID: "u_plain", groupID: "g_delta" })
        )
        expect(row.isBot).toBe(false)
        expect(row.isRealnameVerified).toBe(false)
    })
})
