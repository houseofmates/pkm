// nocobase.ts - Re-exports from nocobase-client.ts for cleaner imports

export {
  nocobaseClient,
  pocketBaseClient,
  pb,
  NocoBaseClient,
  type NocoBaseRecord,
  type PocketBaseRecord,
  type PocketBaseClient,
} from "./nocobase-client";

export { nocobaseClient as default } from "./nocobase-client";
