import { hilltopAdsService } from "./hilltopads-service";

export class HilltopAdsScheduler {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log("HilltopAds scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting HilltopAds automated sync scheduler...");

    const SYNC_INTERVAL = 24 * 60 * 60 * 1000;

    this.syncInterval = setInterval(async () => {
      try {
        console.log("Running automated HilltopAds sync...");
        await hilltopAdsService.syncDailyStats();
        console.log("HilltopAds sync completed successfully");
      } catch (error) {
        console.error("HilltopAds automated sync failed:", error);
      }
    }, SYNC_INTERVAL);

    this.runImmediateSync();
  }

  private async runImmediateSync() {
    try {
      console.log("Running initial HilltopAds inventory sync...");
      await hilltopAdsService.syncInventory();
      console.log("Initial inventory sync completed");
    } catch (error) {
      console.error("Initial sync failed:", error);
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      console.log("HilltopAds scheduler stopped");
    }
  }
}

export const hilltopAdsScheduler = new HilltopAdsScheduler();
