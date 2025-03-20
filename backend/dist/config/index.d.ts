declare const _default: () => {
    port: number;
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    redis: {
        host: string;
        port: number;
    };
    rateLimit: {
        ttl: number;
        max: number;
    };
    newRelic: {
        NEW_RELIC_APP_NAME: string;
        NEW_RELIC_LICENSE_KEY: string;
    };
    apiSecret: {
        key: string;
    };
};
export default _default;
