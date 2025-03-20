"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'postgres',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    rateLimit: {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
    newRelic: {
        NEW_RELIC_APP_NAME: process.env.NEW_RELIC_APP_NAME || 'leaderboard',
        NEW_RELIC_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY || '1234567890',
    },
    apiSecret: {
        key: process.env.API_SECRET_KEY || ''
    }
});
//# sourceMappingURL=index.js.map