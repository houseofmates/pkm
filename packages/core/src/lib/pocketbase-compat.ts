// nocobase compatibility layer
// this file provides backward-compatible exports to ease migration from pocketbase

export {
  nocobaseClient,
  pocketBaseClient,
  pb,
  nocobaseClient as api,
  type NocoBaseRecord,
  type PocketBaseRecord,
  type NocoBaseClient,
  type PocketBaseClient,
} from "./nocobase-client";

// deprecated: use nocobaseclient directly
export default nocobaseClient;
