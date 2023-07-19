import { IsNotEmpty } from "class-validator";

export class AttachmentData {
  @IsNotEmpty({ message: "file_name is required" })
  file_name: string;

  @IsNotEmpty({ message: "attachments.data is required" })
  data: any;
}

// export class VerifyEmailMesage extends WorkerMessage {
//   data: VerifyEmailData;
// }

// Content là những field sẽ được render trong template
export class VerifyEmailContent {
  token: string;
}

export class VerifyEmailData {
  content: VerifyEmailContent;

  subject: string;

  to: string[];
}

export class VerifyEmailMessage {
  data: VerifyEmailData;

  template_id: string;

  notificationId: string;
}

export class EmailDataDto {
  to: string;

  subject: string;

  content: VerifyEmailContent;

  text: string;
}

export class EmailMessageDto {
  text: string;
}
