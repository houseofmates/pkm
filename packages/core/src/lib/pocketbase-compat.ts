// pocketbase compatibility layer
// this file provides backward-compatible exports to ease migration from nocobase

export {
  nocobaseClient,
  pb,
  nocobaseClient as api,
  type PocketBaseRecord,
  type PocketBaseClient,
} from "./pocketbase";

// deprecated: use nocobaseClient directly
export default nocobaseClient;
