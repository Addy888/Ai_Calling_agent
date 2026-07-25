import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TELEPHONY_PROVIDER_TOKEN,
  TelephonyProvider,
  MakeCallParams,
  MakeCallResponse,
  CallStatusData,
} from '../interfaces/telephony-provider.interface';

/**
 * Telephony Manager Service
 *
 * The SINGLE point through which the rest of the application interacts with
 * telephony. It has ZERO knowledge of which provider is active — whether it's
 * MockTelephonyProvider (development) or TwilioProvider (production) is
 * determined entirely at bootstrap via the TELEPHONY_PROVIDER env variable
 * and injected through TELEPHONY_PROVIDER_TOKEN.
 *
 * ──────────────────────────────────────────────────────────────
 *  To switch from mock to Twilio:
 *   change .env:  TELEPHONY_PROVIDER=twilio
 *  Zero code changes required.
 * ──────────────────────────────────────────────────────────────
 */
@Injectable()
export class TelephonyManagerService implements OnModuleInit {
  private readonly logger = new Logger(TelephonyManagerService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(TELEPHONY_PROVIDER_TOKEN)
    private readonly provider: TelephonyProvider,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  async onModuleInit(): Promise<void> {
    const providerEnv = this.configService.get<string>('TELEPHONY_PROVIDER', 'mock');

    this.logger.log(`\n${'═'.repeat(60)}`);
    this.logger.log(`✅ Telephony Provider : ${this.provider.name}`);
    this.logger.log(`✅ Provider Type      : ${this.provider.providerType}`);
    this.logger.log(`✅ Env Selection      : TELEPHONY_PROVIDER=${providerEnv}`);
    this.logger.log(`${'═'.repeat(60)}\n`);

    try {
      await this.provider.initialize();
      this.logger.log(`Provider "${this.provider.name}" initialized successfully`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to initialize telephony provider "${this.provider.name}": ${error.message}`,
          error.stack,
        );
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Make an outbound call
   * Routes transparently to the active provider
   */
  async makeCall(params: MakeCallParams): Promise<MakeCallResponse> {
    this.logger.log(
      `[${this.provider.name}] Making call to ${params.to} (session: ${params.sessionId})`,
    );
    return this.provider.makeCall(params);
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    this.logger.log(`[${this.provider.name}] Ending call: ${callSid}`);
    return this.provider.endCall(callSid);
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Get status of a call
   */
  async getCallStatus(callSid: string): Promise<CallStatusData> {
    return this.provider.getCallStatus(callSid);
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Check provider health
   */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Get active provider display name
   */
  getActiveProviderName(): string {
    return this.provider.name;
  }

  /**
   * Get active provider type
   */
  getActiveProviderType(): string {
    return this.provider.providerType;
  }
}
