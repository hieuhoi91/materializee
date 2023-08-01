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
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
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

  async orderComplete(orderId: string): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new BadRequestException("Order not found");
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException("Order cannot be completed");
      }

      order.status = OrderStatus.COMPLETED;
      await this.orderRepository.save(order);

      this.logger.log(`Order complete success`);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async count(): Promise<any> {
    const total_price = await this.orderRepository
      .createQueryBuilder("order")
      .select("SUM(order.total_price)", "total_price")
      .getRawOne();

    // tính tổng tiền đã bán theo từng tháng
    const total_spent_records = await this.orderRepository
      .createQueryBuilder("order")
      .select("SUM(order.total_price)", "total_price")
      .addSelect("DATE_TRUNC('month', order.created_at)", "month")
      .groupBy("month")
      .getRawMany();

    // tính tổng tiền đã bán theo 12 tháng, nếu  không có thì trả về 0
    // ví dụ {1: 100, 2: 200, 3: 0, 4: 0, 5: 0, 6: 0,7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0}
    const total_spent = Array.from({ length: 12 }, (_, i) => i + 1).reduce(
      (map, obj) => {
        const month = total_spent_records.find(
          record => record.month.getMonth() + 1 === obj,
        );
        if (month) {
          map[obj] = Number(month.total_price);
        } else {
          map[obj] = 0;
        }
        return map;
      },
      {},
    );

    const fiveMostSpentUsers = await this.orderRepository
      .createQueryBuilder("order")
      .select("SUM(order.total_price)", "total_price")
      .addSelect("order.user_id", "user_id")
      .groupBy("user_id")
      .orderBy("total_price", "DESC")
      .limit(5)
      .getRawMany();

    const users = await this.userRepository.find({
      where: {
        id: In(fiveMostSpentUsers.map(user => user.user_id)),
      },
    });

    return {
      count: {
        user_count: await this.userRepository.count(),
        order_count: await this.orderRepository.count(),
        total_price: Number(total_price.total_price),
        item_count: await this.itemRepository.count(),
      },
      total_spent,
      fiveMostSpentUsers: users,
    };
  }
}
