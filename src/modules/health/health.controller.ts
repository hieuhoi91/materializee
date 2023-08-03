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

  @Cron("* * * * * *")
  async cronHeathCheck() {
    try {
      if (!this.configService.isDevelopment) return;
      await axios.get(this.configService.host + "/api/health");
      console.log("Cron Health Check");
    } catch (error) {
      console.log(error);
    }
  }
}
