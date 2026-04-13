// pocketbase compatibility layer
// this file provides backward-compatible exports to ease migration from nocobase

export {
  pocketBaseClient,
  pb,
  pocketBaseClient as api,
  type PocketBaseRecord,
  type PocketBaseClient,
} from "./pocketbase";

// deprecated: use pocketBaseClient directly
export default pocketBaseClient;
