/**
 * core type definitions for the modular schema service
 * 
 * this module defines all the types needed for dynamic table schemas,
 * field definitions, records, and queries. all types use zod for
 * runtime validation and typescript inference.
 */

import { z } from 'zod';

// ============================================================================
// field type definitions
// ============================================================================

/**
 * validation rule for a field - can be a zod schema or custom validator
 */
export const ValidationRuleSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'regex', 'custom']),
  value: z.any().optional(),
  message: z.string().optional(),
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

/**
 * field type definition - defines a reusable field type
 * each field type provides a zod schema for validation
 */
export const FieldTypeDefinitionSchema = z.object({
  // unique identifier for this field type (e.g., 'text', 'number', 'date')
  typeName: z.string(),
  
  // human-readable label for this field type
  label: z.string(),
  
  // zod schema for validating values of this type
  schema: z.custom<z.ZodType<any>>(),
  
  // default value for fields of this type
  defaultValue: z.any().optional(),
  
  // icon name for ui representation
  icon: z.string().optional(),
  
  // description of this field type
  description: z.string().optional(),
  
  // whether this field type supports sorting
  sortable: z.boolean().optional(),
  
  // whether this field type supports filtering
  filterable: z.boolean().optional(),
  
  // configuration schema for this field type (e.g., min/max for numbers)
  configSchema: z.custom<z.ZodType<any>>().optional(),
});

export type FieldTypeDefinition = z.infer<typeof FieldTypeDefinitionSchema>;

// ============================================================================
// field instance definitions
// ============================================================================

/**
 * field definition - defines a field within a table schema
 * this connects a column name to a registered field type
 */
export const FieldDefinitionSchema = z.object({
  // unique identifier for this field within the table
  id: z.string(),
  
  // column name (e.g., 'firstname', 'age', 'email')
  name: z.string(),
  
  // reference to a registered field type
  type: z.string(),
  
  // human-readable label for this field
  label: z.string(),
  
  // whether this field is required
  required: z.boolean().optional(),
  
  // whether this field must be unique across all records
  unique: z.boolean().optional(),
  
  // whether this field is read-only
  readOnly: z.boolean().optional(),
  
  // whether this field is hidden in default views
  hidden: z.boolean().optional(),
  
  // default value for this specific field instance
  defaultValue: z.any().optional(),
  
  // field-specific configuration (validated against field type's configSchema)
  config: z.record(z.any()).optional(),
  
  // validation rules for this field
  validationRules: z.array(ValidationRuleSchema).optional(),
  
  // description/help text for this field
  description: z.string().optional(),
  
  // order index for displaying fields
  order: z.number().optional(),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// ============================================================================
// table definitions
// ============================================================================

/**
 * table metadata - additional information about a table
 */
export const TableMetadataSchema = z.object({
  // display color for the table
  color: z.string().optional(),
  
  // icon name for the table
  icon: z.string().optional(),
  
  // description of the table's purpose
  description: z.string().optional(),
  
  // whether the table is archived/hidden
  archived: z.boolean().default(false),
  
  // custom properties for extensibility
  custom: z.record(z.any()).optional(),
});

export type TableMetadata = z.infer<typeof TableMetadataSchema>;

/**
 * table definition - complete schema for a dynamic table
 */
export const TableDefinitionSchema = z.object({
  // unique identifier for this table
  id: z.string(),
  
  // table name (must be unique, used as identifier)
  name: z.string(),
  
  // human-readable label for the table
  label: z.string(),
  
  // schema version for migrations
  version: z.number().default(1),
  
  // field definitions for this table
  fields: z.array(FieldDefinitionSchema),
  
  // table metadata
  metadata: TableMetadataSchema.optional(),
  
  // created timestamp
  createdAt: z.string().datetime(),
  
  // last updated timestamp
  updatedAt: z.string().datetime(),
});

export type TableDefinition = z.infer<typeof TableDefinitionSchema>;

// ============================================================================
// record definitions
// ============================================================================

/**
 * base record type - all records have these fields
 */
export const BaseRecordSchema = z.object({
  // unique identifier for the record
  id: z.string(),
  
  // when the record was created
  createdAt: z.string().datetime(),
  
  // when the record was last updated
  updatedAt: z.string().datetime(),
  
  // who created the record (for collaboration)
  createdBy: z.string().optional(),
  
  // who last updated the record (for collaboration)
  updatedBy: z.string().optional(),
});

export type BaseRecord = z.infer<typeof BaseRecordSchema>;

/**
 * full record type - base fields plus dynamic data
 */
export type Record = BaseRecord & {
  [fieldName: string]: any;
};

// ============================================================================
// query definitions
// ============================================================================

/**
 * filter operator types
 */
export const FilterOperatorSchema = z.enum([
  'eq',      // equals
  'neq',     // not equals
  'gt',      // greater than
  'gte',     // greater than or equal
  'lt',      // less than
  'lte',     // less than or equal
  'contains', // string contains
  'startsWith', // string starts with
  'endsWith',   // string ends with
  'in',      // in array
  'nin',     // not in array
  'empty',   // is empty/null
  'notEmpty', // is not empty/null
  'between', // between two values
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * filter condition
 */
export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.any().optional(),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

/**
 * filter group - combines multiple conditions with and/or
 */
export interface FilterGroup {
  operator: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
}

/**
 * sort direction
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);

export type SortDirection = z.infer<typeof SortDirectionSchema>;

/**
 * sort specification
 */
export const SortSpecSchema = z.object({
  field: z.string(),
  direction: SortDirectionSchema.default('asc'),
});

export type SortSpec = z.infer<typeof SortSpecSchema>;

/**
 * query options for fetching records
 */
export const QueryOptionsSchema = z.object({
  // filter conditions
  filter: z.union([FilterConditionSchema, FilterGroupSchema]).optional(),
  
  // sort specifications
  sort: z.array(SortSpecSchema).optional(),
  
  // pagination - page number (1-based)
  page: z.number().int().positive().optional(),
  
  // pagination - page size
  pageSize: z.number().int().positive().max(1000).optional(),
  
  // fields to include (undefined = all)
  fields: z.array(z.string()).optional(),
  
  // fields to exclude
  excludeFields: z.array(z.string()).optional(),
});

export type QueryOptions = z.infer<typeof QueryOptionsSchema>;

/**
 * query result with pagination info
 */
export const QueryResultSchema = z.object({
  // matching records
  records: z.array(z.record(z.any())),
  
  // total count (for pagination)
  total: z.number().int().nonnegative(),
  
  // current page
  page: z.number().int().positive(),
  
  // page size
  pageSize: z.number().int().positive(),
  
  // total pages
  totalPages: z.number().int().nonnegative(),
  
  // whether there are more pages
  hasMore: z.boolean(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

// ============================================================================
// change/event definitions (for collaboration)
// ============================================================================

/**
 * change operation types
 */
export const ChangeOperationSchema = z.enum([
  'create',
  'update',
  'delete',
]);

export type ChangeOperation = z.infer<typeof ChangeOperationSchema>;

/**
 * record change event
 */
export const RecordChangeSchema = z.object({
  // unique id for this change (for crdt/ot)
  id: z.string(),
  
  // operation type
  operation: ChangeOperationSchema,
  
  // table name
  tableName: z.string(),
  
  // record id
  recordId: z.string(),
  
  // changed fields (for update)
  changes: z.record(z.any()).optional(),
  
  // full record data (for create)
  record: z.record(z.any()).optional(),
  
  // timestamp
  timestamp: z.string().datetime(),
  
  // user who made the change
  userId: z.string().optional(),
  
  // previous change id (for ordering)
  parentId: z.string().optional(),
});

export type RecordChange = z.infer<typeof RecordChangeSchema>;
