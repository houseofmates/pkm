// This module existed previously as a standalone copy of the schema service.
// To prevent duplicate singleton instances and keep the registry consistent,
// we simply re-export everything from the services version which is the
// authoritative implementation.

export * from '../services/schema.service';
