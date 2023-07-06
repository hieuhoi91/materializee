import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserController } from "./user.controller";
import { UserEntity } from "./user.entity";
import { UserService } from "./user.service";
import { UserSettingsEntity } from "./user-settings.entity";
import { CartModule } from "../cart/cart.module";
import { CartEntity } from "../cart/cart.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity, CartEntity]),
    CartModule,
  ],
  controllers: [UserController],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
