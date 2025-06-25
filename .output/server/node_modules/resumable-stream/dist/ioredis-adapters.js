"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscriberAdapter = createSubscriberAdapter;
exports.createPublisherAdapter = createPublisherAdapter;
/**
 * Creates a Subscriber adapter for a Redis client.
 * @param client - The Redis client to adapt
 * @returns A Subscriber interface compatible with the resumable stream
 */
function createSubscriberAdapter(client) {
    const adapter = {
        connect: () => client.connect(),
        subscribe: async function (channel, callback) {
            client.on("message", (innerChannel, message) => {
                if (channel === innerChannel) {
                    callback(message);
                }
            });
            await client.subscribe(channel);
        },
        unsubscribe: (channel) => client.unsubscribe(channel),
    };
    return adapter;
}
/**
 * Creates a Publisher adapter for a Redis client.
 * @param client - The Redis client to adapt
 * @returns A Publisher interface compatible with the resumable stream
 */
function createPublisherAdapter(client) {
    const adapter = {
        connect: () => client.connect(),
        publish: (channel, message) => client.publish(channel, message),
        set: (key, value, options) => {
            if (options === null || options === void 0 ? void 0 : options.EX) {
                return client.set(key, value, "EX", options.EX);
            }
            return client.set(key, value);
        },
        get: (key) => client.get(key),
        incr: (key) => client.incr(key),
    };
    return adapter;
}
//# sourceMappingURL=ioredis-adapters.js.map