import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: configService.get<string>('redis.host', 'localhost'),
            port: configService.get<number>('redis.port', 6379),
            connectTimeout: configService.get<number>('redis.connectTimeout', 10000),
          },
          password: configService.get<string>('redis.password'),
          database: configService.get<number>('redis.db', 0),
          ttl: configService.get<number>('redis.ttl', 3600) * 1000, // Convert to milliseconds
        });

        return {
          store: () => store,
          ttl: configService.get<number>('redis.ttl', 3600) * 1000,
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
