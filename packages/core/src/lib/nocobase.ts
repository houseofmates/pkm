// nocobase.ts - Re-exports from pocketbase.ts for cleaner imports
// The pocketBaseClient is now a NocoBase-compatible wrapper

export {
  nocobaseClient,
  pocketBaseClient,
  pb,
  PocketBaseClient,
  type PocketBaseRecord,
  type PocketBaseQueryParams,
  type PocketBaseListResult,
} from "./pocketbase";

export default nocobaseClient;
