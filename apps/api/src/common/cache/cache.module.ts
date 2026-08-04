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
        const redisHost = configService.get<string>('redis.host', 'localhost');
        const redisPort = configService.get<number>('redis.port', 6379);
        const redisPassword = configService.get<string>('redis.password');
        const connectTimeout = configService.get<number>('redis.connectTimeout', 5000);

        try {
          console.log(`🔌 Attempting to connect to Redis at ${redisHost}:${redisPort}...`);
          
          const store = await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
              connectTimeout,
              reconnectStrategy: (retries: number) => {
                if (retries > 10) {
                  console.error('❌ Redis reconnection failed after 10 attempts');
                  return false; // Stop reconnecting
                }
                const delay = Math.min(retries * 1000, 10000);
                console.log(`⏳ Redis reconnecting in ${delay}ms (attempt ${retries})`);
                return delay;
              },
            },
            password: redisPassword,
            database: configService.get<number>('redis.db', 0),
            ttl: configService.get<number>('redis.ttl', 3600) * 1000, // Convert to milliseconds
          });

          // Test the connection
          await store.client.ping();

          console.log('✅ Redis cache store initialized successfully');
          console.log(`   Host: ${redisHost}:${redisPort}`);

          return {
            store: () => store,
            ttl: configService.get<number>('redis.ttl', 3600) * 1000,
          };
        } catch (error) {
          console.error('❌ Redis connection failed:', error.message);
          console.warn('⚠️  Falling back to in-memory cache');
          console.warn('⚠️  Distributed caching will not be available');
          console.warn('⚠️  To fix: Ensure Redis is installed and running on', `${redisHost}:${redisPort}`);
          
          // Fallback to in-memory cache if Redis is not available
          return {
            ttl: configService.get<number>('redis.ttl', 3600) * 1000,
            max: 100, // Maximum number of items in cache
          };
        }
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
