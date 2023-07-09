import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { OrderEntity } from "./order.entity";
import { ItemEntity } from "../item/item.entity";
import { CreateOrderRequestBaseDto } from "./dtos/order.dto";
import { OrderItemEntity } from "./orderItem.entity";
import { OrderStatus } from "./enum";
import { CartEntity } from "../cart/cart.entity";
import { UserEntity } from "../user/user.entity";
import { CartItemEntity } from "../cart/cart-item.entity";
import { ReviewEntity } from "../review/review.entity";

interface OrderServiceInterface {
  create(c: CreateOrderRequestBaseDto, userId: string): Promise<void>;
}

@Injectable()
export class OrderService implements OrderServiceInterface {
  private readonly logger: Logger = new Logger(OrderService.name);
  constructor(
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private orderItemRepository: Repository<OrderItemEntity>,
    @InjectRepository(ItemEntity)
    private itemRepository: Repository<ItemEntity>,
    @InjectRepository(CartItemEntity)
    private cartItemRepository: Repository<CartItemEntity>,
    @InjectRepository(ReviewEntity)
    private reviewRepository: Repository<ReviewEntity>,
  ) {}

  async create(c: CreateOrderRequestBaseDto, userId: string): Promise<void> {
    try {
      const itemIds = c.data.map(item => item.item_id);
      const item = await this.itemRepository.find({
        where: { id: In(itemIds) },
      });

      const mapItem = item.reduce((map, obj) => {
        map[obj.id] = obj;
        return map;
      }, {});

      if (item.length !== itemIds.length) {
        throw new BadRequestException("Item not found");
      }

      // check quantity
      let totalQuantity = 0;
      let totalPrice = 0;
      c.data.forEach(item => {
        if (item.quantity > mapItem[item.item_id].quantity) {
          throw new BadRequestException(
            `Quantity of ${mapItem[item.item_id].name} is not enough`,
          );
        }
        totalPrice += item.quantity * mapItem[item.item_id].price;
        totalQuantity += item.quantity;
      });

      // create order item
      const orderItems = c.data.map(item => {
        const orderItem = new OrderItemEntity();
        orderItem.item_id = item.item_id;
        orderItem.quantity = item.quantity;
        orderItem.price = mapItem[item.item_id].price;
        orderItem.user_id = userId;

        return orderItem;
      });

      const r = await this.orderItemRepository.save(orderItems);

      // create order
      const order = new OrderEntity();
      order.user_id = userId;
      order.total_quantity = totalQuantity;
      order.total_price = totalPrice;
      order.status = OrderStatus.PENDING;
      order.orderItems = r;

      await this.orderRepository.save(order);

      await this.cartItemRepository.delete({
        item: {
          id: In(itemIds),
        },
      });
      // update quantity
      await Promise.all(
        c.data.map(item => {
          mapItem[item.item_id].quantity -= item.quantity;
          return this.itemRepository.save(mapItem[item.item_id]);
        }),
      );

      this.logger.log(`Create order success`);
    } catch (e) {
      console.log(e.stack);
      throw new BadRequestException(e);
    }
  }

  async list(userId: string): Promise<any> {
    try {
      // check user already review
      const orders: any = await this.orderRepository.find({
        where: { user_id: userId },
        relations: ["orderItems", "orderItems.item"],
      });

      const reviews = await this.reviewRepository.find({
        where: { user_id: userId },
      });

      orders.forEach(order => {
        order.orderItems.forEach(item => {
          const review = reviews.find(
            review => review.order_item_id === item.id,
          );

          if (review) {
            item.is_reviewed = true;
          } else {
            item.is_reviewed = false;
          }
        });
      });
      return orders;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async cancel(orderId: string, userId: string): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId, user_id: userId },
        relations: ["orderItems"],
      });

      if (!order) {
        throw new BadRequestException("Order not found");
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException("Order cannot be canceled");
      }

      order.status = OrderStatus.CANCELLED;
      await this.orderRepository.save(order);

      // update quantity
      await Promise.all(
        order.orderItems.map(item => {
          return this.itemRepository
            .findOne({ where: { id: item.item_id } })
            .then(item => {
              item.quantity += item.quantity;
              return this.itemRepository.save(item);
            });
        }),
      );

      this.logger.log(`Cancel order success`);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
