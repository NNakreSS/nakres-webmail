import { Controller, Get, Query } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('inbox')
  async getInbox(@Query('userId') userId: string) {
    return this.mailService.getInbox(userId);
  }
}
