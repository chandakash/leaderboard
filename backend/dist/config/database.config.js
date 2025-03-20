"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseConfig = void 0;
const getDatabaseConfig = (configService) => {
    const isProd = configService.get('NODE_ENV') === 'production';
    return {
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: !isProd,
        extra: {
            max: isProd ? 50 : 25,
            min: isProd ? 10 : 5,
            connectionTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
            maxLifetimeMillis: 3600000,
        },
    };
};
exports.getDatabaseConfig = getDatabaseConfig;
//# sourceMappingURL=database.config.js.map