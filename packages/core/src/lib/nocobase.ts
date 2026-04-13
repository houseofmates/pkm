// nocobase.ts - Re-exports from pocketbase.ts for cleaner imports
// The pocketBaseClient is now a NocoBase-compatible wrapper

export {
  pocketBaseClient,
  pb,
  PocketBaseClient,
  type PocketBaseRecord,
  type PocketBaseQueryParams,
  type PocketBaseListResult,
} from "./pocketbase";

export { pocketBaseClient as nocobaseClient } from "./pocketbase";

import { pocketBaseClient } from "./pocketbase";
export default pocketBaseClient;
