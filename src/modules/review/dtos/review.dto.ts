import { BaseRequestDto } from "src/common/abstract.dto";

export class CreateReviewRequestBaseDto extends BaseRequestDto {
  content: string;
  rating: number;
  order_item_id: string;
  item_id: string;
}
