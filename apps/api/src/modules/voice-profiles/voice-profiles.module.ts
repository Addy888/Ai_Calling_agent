import { Module } from '@nestjs/common';
import { VoiceProfileController } from './voice-profiles.controller';
import { VoiceProfileService } from './voice-profiles.service';

@Module({
  controllers: [VoiceProfileController],
  providers: [VoiceProfileService],
  exports: [VoiceProfileService],
})
export class VoiceProfilesModule {}
