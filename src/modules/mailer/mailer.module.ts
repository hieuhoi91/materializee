import { Module } from "@nestjs/common";
import { MailerModule as NestMailerModule } from "@nestjs-modules/mailer";
import { SharedModule } from "../../shared/services/shared.module";
import { ApiConfigService } from "../../shared/services/api-config.service";
import { MailerService } from "./mailer.service";
import { MailerController } from "./mailer.controller";

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [SharedModule],
      useFactory: async (apiConfigService: ApiConfigService) => {
        return apiConfigService.mailerConfig;
      },
      inject: [ApiConfigService],
    }),
  ],
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
