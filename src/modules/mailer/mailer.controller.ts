import { Body, Controller, Injectable, Logger, Post } from "@nestjs/common";
import { MailerService as NestMailer } from "@nestjs-modules/mailer";
import { EmailMessageDto } from "./dtos/email.dto";

@Controller("/mailer")
export class MailerController {
  private readonly logger = new Logger(MailerController.name);

  constructor(private readonly nestMailerService: NestMailer) {}

  @Post("/send")
  public async sendMail(@Body() data: EmailMessageDto) {
    try {
      await this.nestMailerService.sendMail({
        to: "2051120316@ut.edu.vn",
        from: "thanhbkbk111@gmail.com",
        subject: "Liên hệ hỗ trợ",
        // template: data.template_id,
        text: data.text,
      });
    } catch (error) {
      this.logger.error(
        `[EMAIL FAILED] ${"thanhbkbk111@gmail.com"} - ${"Liên hệ hỗ trợ"}`,
        error.stack,
      );
      throw error;
    }
    this.logger.log(`[EMAIL] ${"thanhbkbk111@gmail.com"} - "Liên hệ hỗ trợ"`);

    return {
      message: "Email sent successfully",
    };
  }
}
