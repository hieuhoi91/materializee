import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";
import { ApiConfigService } from "../../shared/services/api-config.service";
import axios from "axios";
import { Cron } from "@nestjs/schedule";

@Controller("health")
export class HealthController {
  constructor(private configService: ApiConfigService) {}

  @Get()
  async healthCheck(): Promise<any> {
    return {
      name: "Materialize",
      status: "ok",
      message: "Server is running",
      timestamp: new Date().toISOString(),
    };
  }

  @Cron("0 */5 * * * *")
  async cronHeathCheck() {
    if (!this.configService.isDevelopment) return;
    try {
      await axios.get(this.configService.host + "/api/health");
      console.log("Cron Health Check");
    } catch (error) {
      console.log(error);
    }
  }
}
