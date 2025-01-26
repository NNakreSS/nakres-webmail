import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly client: RedisClientType,
  ) {}

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value));
    if (ttl) {
      await this.client.expire(key, ttl);
    }
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
}
