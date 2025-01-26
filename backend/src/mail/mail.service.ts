import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/redis/redis.service';

@Injectable()
export class MailService {
  constructor(private readonly redisService: RedisService) {}

  async getInbox(userId: string) {
    const cached = await this.redisService.get(`emails:${userId}:INBOX`);
    if (cached) return cached;

    // TODO: get emails from imap
    const emails = [];
    await this.redisService.set(`emails:${userId}:INBOX`, emails, 60 * 5); // cache for 5 minutes
    return emails;
  }
}
