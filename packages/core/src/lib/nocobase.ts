// nocobase.ts - Re-exports from nocobase-client.ts for cleaner imports

export {
  nocobaseClient,
  pb,
  NocoBaseClient,
  type NocoBaseRecord,
} from "./nocobase-client";

export { nocobaseClient as default } from "./nocobase-client";
