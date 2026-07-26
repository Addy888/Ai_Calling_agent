import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { GSMGatewayController } from './gsm-gateway.controller';
import { GSMManagerService } from './services/gsm-manager.service';
import { SIMManagerService } from './services/sim-manager.service';
import { ChannelManagerService } from './services/channel-manager.service';

@Module({
  imports: [PrismaModule],
  controllers: [GSMGatewayController],
  providers: [
    GSMManagerService,
    SIMManagerService,
    ChannelManagerService,
  ],
  exports: [
    GSMManagerService,
    SIMManagerService,
    ChannelManagerService,
  ],
})
export class GSMGatewayModule {}
