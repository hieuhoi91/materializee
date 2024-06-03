import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import axios from "axios";

@Injectable()
export default class CronService {
  constructor() {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async callAPI() {
    try {
      const _ = await axios.get("https://hieuhoine.onrender.com/api/cat");
    } catch (error) {
      console.error("Error calling API:", error.message);
    }
  }
}
