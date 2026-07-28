import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

/**
 * Service for managing JWT token blacklist using Redis
 * Blacklisted tokens are stored in Redis with TTL matching token expiration
 */
@Injectable()
export class TokenBlacklistService {
  private readonly jwtExpiresIn: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    // Parse JWT_EXPIRES_IN (e.g., "15m" -> 900 seconds)
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.jwtExpiresIn = this.parseExpiration(expiresIn);
  }

  /**
   * Add a token to the blacklist
   * @param token JWT token to blacklist
   * @param userId User ID for logging
   * @param reason Reason for blacklisting (logout, security, etc.)
   */
  async blacklistToken(token: string, userId: string, reason: string): Promise<void> {
    const key = this.getBlacklistKey(token);
    
    // Store token with metadata
    await this.cacheManager.set(
      key,
      {
        userId,
        reason,
        blacklistedAt: new Date().toISOString(),
      },
      this.jwtExpiresIn * 1000, // Convert to milliseconds
    );
  }

  /**
   * Check if a token is blacklisted
   * @param token JWT token to check
   * @returns true if blacklisted, false otherwise
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = this.getBlacklistKey(token);
    const value = await this.cacheManager.get(key);
    return value !== null && value !== undefined;
  }

  /**
   * Blacklist all tokens for a specific user (e.g., on password change)
   * @param userId User ID
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    const key = this.getUserBlacklistKey(userId);
    
    // Set a flag that all tokens for this user are invalid
    await this.cacheManager.set(
      key,
      {
        blacklistedAt: new Date().toISOString(),
        reason: 'all_tokens_invalidated',
      },
      this.jwtExpiresIn * 1000,
    );
  }

  /**
   * Check if all tokens for a user are blacklisted
   * @param userId User ID
   * @param tokenIssuedAt Token issue timestamp
   * @returns true if all user tokens are blacklisted
   */
  async areAllUserTokensBlacklisted(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const key = this.getUserBlacklistKey(userId);
    const value: any = await this.cacheManager.get(key);
    
    if (!value) {
      return false;
    }

    // Check if token was issued before the blacklist timestamp
    const blacklistedAt = new Date(value.blacklistedAt).getTime() / 1000;
    return tokenIssuedAt < blacklistedAt;
  }

  /**
   * Clear blacklist entry for a user (e.g., for testing)
   * @param userId User ID
   */
  async clearUserBlacklist(userId: string): Promise<void> {
    const key = this.getUserBlacklistKey(userId);
    await this.cacheManager.del(key);
  }

  /**
   * Generate blacklist key for a specific token
   */
  private getBlacklistKey(token: string): string {
    return `blacklist:token:${token}`;
  }

  /**
   * Generate blacklist key for all user tokens
   */
  private getUserBlacklistKey(userId: string): string {
    return `blacklist:user:${userId}`;
  }

  /**
   * Parse JWT expiration string to seconds
   * @param expiration String like "15m", "1h", "7d"
   * @returns Expiration in seconds
   */
  private parseExpiration(expiration: string): number {
    const units: { [key: string]: number } = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * units[unit];
  }
}
