// nocobase.ts - Re-exports from nocobase-client.ts for cleaner imports

export {
  nocobaseClient,
  pb,
  NocoBaseClient,
  type NocoBaseRecord,
  type NocoBaseClient,
} from "./nocobase-client";

export { nocobaseClient as default } from "./nocobase-client";
