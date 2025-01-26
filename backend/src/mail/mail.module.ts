import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { RedisModule } from '../shared/redis/redis.module';
@Module({
  imports: [RedisModule],
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}
