/**
 * schema module - modular database canvas foundation
 * 
 * this module provides the core infrastructure for a visual, programmable
 * database canvas. it includes:
 * 
 * - type definitions for tables, fields, records, and queries
 * - extensible field type registry
 * - persistence layer using indexeddb
 * - main schema service for crud operations
 * 
 * usage:
 * ```typescript
 * import { schemaService, fieldRegistry } from '@/schema';
 * 
 * // initialize
 * await schemaService.initialize();
 * 
 * // create a table
 * const table = await schemaService.createTable('tasks', 'tasks', [
 *   { name: 'title', type: 'text', label: 'title' },
 *   { name: 'done', type: 'boolean', label: 'done' },
 * ]);
 * 
 * // create a record
 * const record = await schemaService.createRecord('tasks', {
 *   title: 'buy groceries',
 *   done: false,
 * });
 * ```
 */

// export all types
export type {
  ValidationRule,
  FieldTypeDefinition,
  FieldDefinition,
  TableMetadata,
  TableDefinition,
  BaseRecord,
  Record,
  FilterOperator,
  FilterCondition,
  FilterGroup,
  SortDirection,
  SortSpec,
  QueryOptions,
  QueryResult,
  ChangeOperation,
  RecordChange,
} from './types';

// export schemas for runtime validation
export {
  ValidationRuleSchema,
  FieldTypeDefinitionSchema,
  FieldDefinitionSchema,
  TableMetadataSchema,
  TableDefinitionSchema,
  BaseRecordSchema,
  FilterOperatorSchema,
  FilterConditionSchema,
  SortDirectionSchema,
  SortSpecSchema,
  QueryOptionsSchema,
  QueryResultSchema,
  ChangeOperationSchema,
  RecordChangeSchema,
} from './types';

// export services
export { fieldRegistry, registerBuiltinFieldTypes } from './field-registry';
export { persistenceService } from './persistence-service';
export { schemaService } from './schema-service';
