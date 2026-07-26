import { Module } from '@nestjs/common';
import { TelephonyProfileController } from './telephony-profile.controller';
import { TelephonyProfileService } from './telephony-profile.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TelephonyProfileController],
  providers: [TelephonyProfileService],
  exports: [TelephonyProfileService],
})
export class TelephonyProfileModule {}
