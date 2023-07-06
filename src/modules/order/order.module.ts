import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrderEntity } from "./order.entity";
import { OrderController } from "./order.controller";
import { ItemEntity } from "../item/item.entity";
import { OrderItemEntity } from "./orderItem.entity";
import { OrderService } from "./order.service";
import { UserEntity } from "../user/user.entity";
import { CartItemEntity } from "../cart/cart-item.entity";
import { CartEntity } from "../cart/cart.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemEntity,
      UserEntity,
      CartItemEntity,
      CartEntity,
      OrderEntity,
      OrderItemEntity,
    ]),
  ],
  controllers: [OrderController],
  exports: [OrderService],
  providers: [OrderService],
})
export class OrderModule {}
