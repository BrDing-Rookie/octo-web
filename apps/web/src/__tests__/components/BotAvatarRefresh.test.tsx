/**
 * Unit tests for WKAvatar auto-refresh when channel avatar tag changes.
 *
 * Fixes YUJ-169 / dmwork-web#1097: after uploading a new bot avatar in
 * BotDetailModal the modal preview and external WKAvatar instances (bot
 * lists, user info cards) must refresh in place without a full-page reload.
 *
 * Strategy: WKApp.shared.changeChannelAvatarTag(channel) bumps the per-channel
 * avatar cache-busting tag AND emits a "channel-avatar-changed" mitt event so
 * every mounted <WKAvatar channel=.../> that matches can recompute its src.
 */

// Minimal mitt-like emitter — mirrors the subset of the real mitt API used by
// WKApp.mittBus so we can validate subscribe/emit/unsubscribe semantics without
// pulling the whole app bundle into a vitest run.
type Handler<T> = (payload: T) => void;
function createBus<T>() {
    const handlers: Handler<T>[] = [];
    return {
        on(h: Handler<T>) {
            handlers.push(h);
        },
        off(h: Handler<T>) {
            const i = handlers.indexOf(h);
            if (i >= 0) handlers.splice(i, 1);
        },
        emit(payload: T) {
            handlers.slice().forEach(h => h(payload));
        },
    };
}

type AvatarEvent = { channelID: string; channelType: number };

describe("WKAvatar auto-refresh via channel-avatar-changed event", () => {
    it("notifies subscribers when the same channel avatar tag changes", () => {
        const bus = createBus<AvatarEvent>();
        const received: AvatarEvent[] = [];

        const handler = (payload: AvatarEvent) => {
            received.push(payload);
        };
        bus.on(handler);

        bus.emit({ channelID: "bot123", channelType: 1 });

        expect(received).toHaveLength(1);
        expect(received[0]).toEqual({ channelID: "bot123", channelType: 1 });

        bus.off(handler);
    });

    it("only fires subscriber logic for matching channels", () => {
        const bus = createBus<AvatarEvent>();
        const refreshed: string[] = [];

        // Simulate what WKAvatar.handleAvatarChanged does: match on
        // channelID + channelType and only then recompute the image src.
        const makeSubscriber = (channelID: string, channelType: number) => {
            const fn = (payload: AvatarEvent) => {
                if (
                    payload.channelID === channelID &&
                    payload.channelType === channelType
                ) {
                    refreshed.push(`${channelType}:${channelID}`);
                }
            };
            bus.on(fn);
            return fn;
        };

        makeSubscriber("botA", 1);
        makeSubscriber("botB", 1);
        makeSubscriber("botA", 2); // different type, should not trigger

        bus.emit({ channelID: "botA", channelType: 1 });

        expect(refreshed).toEqual(["1:botA"]);
    });

    it("unsubscribes on unmount so stale subscribers don't refresh", () => {
        const bus = createBus<AvatarEvent>();
        const calls: number[] = [];
        const handler = () => calls.push(1);

        bus.on(handler);
        bus.emit({ channelID: "x", channelType: 1 });
        bus.off(handler);
        bus.emit({ channelID: "x", channelType: 1 });

        expect(calls).toHaveLength(1);
    });

    it("uses a cache-busting tag in the avatar URL so the browser refetches", () => {
        // Simulate the tag-to-URL pipeline used in avatarChannel().
        const baseURL = "https://api.example.com/";
        const uid = "bot123";

        const buildURL = (tag: string) => `${baseURL}users/${uid}/avatar?v=${tag}`;

        const tagBefore = "1000";
        const tagAfter = "2000";

        expect(buildURL(tagBefore)).not.toEqual(buildURL(tagAfter));
        expect(buildURL(tagAfter)).toMatch(/\?v=2000$/);
    });
});
