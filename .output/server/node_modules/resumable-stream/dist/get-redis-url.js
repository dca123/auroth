"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisUrl = getRedisUrl;
function getRedisUrl() {
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    if (!redisUrl) {
        throw new Error("REDIS_URL environment variable is not set");
    }
    return redisUrl;
}
//# sourceMappingURL=get-redis-url.js.map