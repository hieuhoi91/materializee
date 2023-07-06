import {
  Column,
  Entity,
  OneToOne,
  BeforeInsert,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../common/abstract.entity";
import { CartItemEntity } from "./cart-item.entity";
import { UserEntity } from "../user/user.entity";

@Entity({ name: "carts" })
export class CartEntity extends BaseEntity {
  @OneToMany(() => CartItemEntity, cartItem => cartItem.cart)
  cart_items: CartItemEntity[];

  @Column()
  user_id: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({
    name: "user_id",
  })
  user: UserEntity;
}
