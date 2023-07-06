import {
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
// import { ValidatorService } from '../../shared/services/validator.service';
import type { AddToCartDto } from "./dtos/cart.dto";
import { CartEntity } from "./cart.entity";
import { CartItemEntity } from "./cart-item.entity";
import { ItemEntity } from "../item/item.entity";
import { CustomHttpException } from "../../common/exception/custom-http.exception";
import { StatusCodesList } from "../../common/constants/status-codes-list.constants";

@Injectable()
export class CartService {
  private readonly logger: Logger = new Logger(CartService.name);
  constructor(
    @InjectRepository(CartEntity)
    private cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private cartItemRepository: Repository<CartItemEntity>,
    @InjectRepository(ItemEntity)
    private itemRepo: Repository<ItemEntity>,
  ) {}

  findCartById(cartId: string): Promise<CartEntity> {
    return this.cartRepository.findOne({
      where: { id: cartId },
      relations: ["cart_items", "cart_items.item"],
    });
  }
  async addToCart(
    userId: string,
    cartId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartEntity> {
    let cart = await this.findCartById(cartId);
    if (!cart) {
      cart = await this.createCart(userId);
    }

    for (const item of addToCartDto.items) {
      const existingCartItem = cart.cart_items?.find(
        cartItem => cartItem.item.id === item.itemId,
      );

      if (existingCartItem) {
        existingCartItem.quantity += item.quantity;
        await this.cartItemRepository.save(existingCartItem);
      } else {
        const i = await this.itemRepo.findOne({
          where: { id: item.itemId },
        });
        const newCartItem = await this.cartItemRepository.save({
          cartId: cart.id,
          item: i,
          quantity: item.quantity,
        });
        cart.cart_items?.push(newCartItem);
      }
    }

    cart = await this.cartRepository.save(cart);
    return cart;
  }

  async createCart(userId: string): Promise<CartEntity> {
    return this.cartRepository.save({
      user_id: userId,
    });
  }

  async deleteCartItem(cartId: string, itemsId: string[]): Promise<CartEntity> {
    const cart = await this.findCartById(cartId);
    if (!cart) {
      throw new CustomHttpException({
        statusCode: HttpStatus.NOT_FOUND,
        code: StatusCodesList.NotFound,
      });
    }

    const items = await this.cartItemRepository.findByIds(itemsId);
    if (items.length !== itemsId.length) {
      throw new CustomHttpException({
        statusCode: HttpStatus.NOT_FOUND,
        code: StatusCodesList.NotFound,
      });
    }
    await this.cartItemRepository.remove(items);
    return this.findCartById(cartId);
  }
}
