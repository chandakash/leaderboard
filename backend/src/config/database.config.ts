import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProd = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    // ssl: { rejectUnauthorized: false },
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProd,
    // logging: configService.get('NODE_ENV') === 'development',
    extra: {
      max: isProd ? 50 : 25,
      min: isProd ? 10 : 5,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,      
      maxLifetimeMillis: 3600000,
    },
  };
};