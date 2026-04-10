import { DatabaseStorage } from "../storage";

/**
 * Transitional Insforge storage adapter.
 * Keeps THORX operational while DB migration is phased.
 */
export class InsforgeStorage extends DatabaseStorage {
  constructor() {
    super();
    console.log("[Storage] InsforgeStorage adapter enabled (compatibility mode)");
  }
}
