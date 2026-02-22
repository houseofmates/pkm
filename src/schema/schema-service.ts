/**
 * main schema service for the modular database canvas
 * 
 * this is the primary service for managing dynamic tables, fields, and records.
 * it combines the field registry, persistence layer, and validation into a
 * unified api. this service is the foundation for the visual, programmable
 * database canvas.
 */

import { z } from 'zod';
import { fieldRegistry, registerBuiltinFieldTypes } from './field-registry';
import { persistenceService } from './persistence-service';
import type {
  TableDefinition,
  FieldDefinition,
  Record,
  QueryOptions,
  QueryResult,
  TableMetadata,
} from './types';

// ensure built-in field types are registered
registerBuiltinFieldTypes();

/**
 * schema service class - main api for dynamic table management
 */
class SchemaService {
  private initialized: boolean = false;

  /**
   * initialize the schema service
   * this must be called before any other operations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await persistenceService.initialize();
    this.initialized = true;
    
    console.log('schema service initialized');
  }

  /**
   * ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('schema service not initialized. call initialize() first.');
    }
  }

  // ============================================================================
  // table management
  // ============================================================================

  /**
   * create a new dynamic table
   * @param name unique table name (identifier)
   * @param label human-readable label
   * @param fields array of field definitions
   * @param metadata optional table metadata
   * @returns the created table definition
   */
  public async createTable(
    name: string,
    label: string,
    fields: Omit<FieldDefinition, 'id'>[],
    metadata?: TableMetadata
  ): Promise<TableDefinition> {
    this.ensureInitialized();

    // validate table name
    if (!name || typeof name !== 'string') {
      throw new Error('table name is required');
    }

    // check if table already exists
    const existing = await persistenceService.getTableByName(name);
    if (existing) {
      throw new Error(`table "${name}" already exists`);
    }

    // validate all field types are registered
    for (const field of fields) {
      if (!fieldRegistry.has(field.type)) {
        throw new Error(`field type "${field.type}" is not registered for field "${field.name}"`);
      }
    }

    // generate field ids
    const fieldsWithIds: FieldDefinition[] = fields.map((field, index) => ({
      ...field,
      id: `${name}_field_${index}_${Date.now()}`,
    }));

    // create table definition
    const now = new Date().toISOString();
    const table: TableDefinition = {
      id: `${name}_${Date.now()}`,
      name,
      label,
      version: 1,
      fields: fieldsWithIds,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // save to persistence
    await persistenceService.saveTable(table);

    console.log('table created:', table.name, 'with', table.fields.length, 'fields');
    return table;
  }

  /**
   * get a table by name
   * @param name the table name
   * @returns the table definition or undefined
   */
  public async getTable(name: string): Promise<TableDefinition | undefined> {
    this.ensureInitialized();
    return persistenceService.getTableByName(name);
  }

  /**
   * get all tables
   * @returns array of all table definitions
   */
  public async getAllTables(): Promise<TableDefinition[]> {
    this.ensureInitialized();
    return persistenceService.getAllTables();
  }

  /**
   * update a table's schema
   * @param name the table name
   * @param updates partial updates to apply
   * @returns the updated table definition
   */
  public async updateTable(
    name: string,
    updates: {
      label?: string;
      fields?: FieldDefinition[];
      metadata?: TableMetadata;
    }
  ): Promise<TableDefinition> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(name);
    if (!table) {
      throw new Error(`table "${name}" not found`);
    }

    // apply updates
    if (updates.label !== undefined) {
      table.label = updates.label;
    }

    if (updates.fields !== undefined) {
      // validate new field types
      for (const field of updates.fields) {
        if (!fieldRegistry.has(field.type)) {
          throw new Error(`field type "${field.type}" is not registered`);
        }
      }
      table.fields = updates.fields;
    }

    if (updates.metadata !== undefined) {
      table.metadata = { ...table.metadata, ...updates.metadata };
    }

    // update version and timestamp
    table.version += 1;
    table.updatedAt = new Date().toISOString();

    await persistenceService.saveTable(table);
    return table;
  }

  /**
   * delete a table and all its records
   * @param name the table name to delete
   */
  public async deleteTable(name: string): Promise<void> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(name);
    if (!table) {
      throw new Error(`table "${name}" not found`);
    }

    await persistenceService.deleteTable(table.id);
    console.log('table deleted:', name);
  }

  // ============================================================================
  // field management
  // ============================================================================

  /**
   * add a field to an existing table
   * @param tableName the table name
   * @param field the field definition (without id)
   * @returns the updated table definition
   */
  public async addField(
    tableName: string,
    field: Omit<FieldDefinition, 'id'>
  ): Promise<TableDefinition> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(tableName);
    if (!table) {
      throw new Error(`table "${tableName}" not found`);
    }

    // validate field type
    if (!fieldRegistry.has(field.type)) {
      throw new Error(`field type "${field.type}" is not registered`);
    }

    // generate field id
    const newField: FieldDefinition = {
      ...field,
      id: `${tableName}_field_${table.fields.length}_${Date.now()}`,
    };

    table.fields.push(newField);
    table.updatedAt = new Date().toISOString();

    await persistenceService.saveTable(table);
    return table;
  }

  /**
   * remove a field from a table
   * @param tableName the table name
   * @param fieldId the field id to remove
   * @returns the updated table definition
   */
  public async removeField(tableName: string, fieldId: string): Promise<TableDefinition> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(tableName);
    if (!table) {
      throw new Error(`table "${tableName}" not found`);
    }

    const fieldIndex = table.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) {
      throw new Error(`field "${fieldId}" not found in table "${tableName}"`);
    }

    table.fields.splice(fieldIndex, 1);
    table.updatedAt = new Date().toISOString();

    await persistenceService.saveTable(table);
    return table;
  }

  // ============================================================================
  // record operations
  // ============================================================================

  /**
   * create a new record in a table
   * @param tableName the table name
   * @param data the record data (without system fields)
   * @returns the created record with id and timestamps
   */
  public async createRecord(
    tableName: string,
    data: Record<string, any>
  ): Promise<Record> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(tableName);
    if (!table) {
      throw new Error(`table "${tableName}" not found`);
    }

    // generate validation schema
    const schema = fieldRegistry.generateRecordSchema(table.fields);

    // validate data
    const validationResult = schema.safeParse(data);
    if (!validationResult.success) {
      throw new Error(`validation failed: ${validationResult.error.message}`);
    }

    // apply default values for missing fields
    const recordData: Record<string, any> = {};
    for (const field of table.fields) {
      if (data[field.name] !== undefined) {
        recordData[field.name] = data[field.name];
      } else {
        recordData[field.name] = fieldRegistry.getDefaultValue(field);
      }
    }

    // create full record with system fields
    const now = new Date().toISOString();
    const record: Record = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...recordData,
    };

    // save to persistence
    await persistenceService.saveRecord(tableName, record);

    return record;
  }

  /**
   * get a record by id
   * @param recordId the record id
   * @returns the record or undefined
   */
  public async getRecord(recordId: string): Promise<Record | undefined> {
    this.ensureInitialized();
    return persistenceService.getRecord(recordId);
  }

  /**
   * update a record
   * @param tableName the table name
   * @param recordId the record id
   * @param updates the data to update
   * @returns the updated record
   */
  public async updateRecord(
    tableName: string,
    recordId: string,
    updates: Record<string, any>
  ): Promise<Record> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(tableName);
    if (!table) {
      throw new Error(`table "${tableName}" not found`);
    }

    const existing = await persistenceService.getRecord(recordId);
    if (!existing) {
      throw new Error(`record "${recordId}" not found`);
    }

    // validate only the fields being updated
    const schema = fieldRegistry.generateRecordSchema(table.fields);
    const updatedData = { ...existing, ...updates };
    
    const validationResult = schema.safeParse(updatedData);
    if (!validationResult.success) {
      throw new Error(`validation failed: ${validationResult.error.message}`);
    }

    // update record
    const record: Record = {
      ...existing,
      ...updates,
      id: recordId, // ensure id doesn't change
      updatedAt: new Date().toISOString(),
    };

    await persistenceService.saveRecord(tableName, record);
    return record;
  }

  /**
   * delete a record
   * @param recordId the record id to delete
   */
  public async deleteRecord(recordId: string): Promise<void> {
    this.ensureInitialized();
    await persistenceService.deleteRecord(recordId);
  }

  /**
   * query records from a table
   * @param tableName the table name
   * @param options query options (filter, sort, pagination)
   * @returns query result with records and pagination info
   */
  public async queryRecords(
    tableName: string,
    options?: QueryOptions
  ): Promise<QueryResult> {
    this.ensureInitialized();

    const table = await persistenceService.getTableByName(tableName);
    if (!table) {
      throw new Error(`table "${tableName}" not found`);
    }

    return persistenceService.queryRecords(tableName, options);
  }

  /**
   * get all records from a table
   * @param tableName the table name
   * @returns array of all records
   */
  public async getAllRecords(tableName: string): Promise<Record[]> {
    this.ensureInitialized();
    return persistenceService.getRecordsByTable(tableName);
  }

  // ============================================================================
  // utility operations
  // ============================================================================

  /**
   * export all data (for backup)
   * @returns all tables and records
   */
  public async exportAll(): Promise<{ tables: TableDefinition[]; records: Record[] }> {
    this.ensureInitialized();
    return persistenceService.exportAll();
  }

  /**
   * import data (for restore)
   * @param data the data to import
   */
  public async importAll(data: { tables: TableDefinition[]; records: Record[] }): Promise<void> {
    this.ensureInitialized();
    return persistenceService.importAll(data);
  }

  /**
   * clear all data (use with caution!)
   */
  public async clearAll(): Promise<void> {
    this.ensureInitialized();
    return persistenceService.clearAll();
  }

  /**
   * get the field registry (for registering custom field types)
   */
  public getFieldRegistry() {
    return fieldRegistry;
  }
}

// singleton instance
export const schemaService = new SchemaService();

// re-export types and services
export { fieldRegistry, persistenceService, registerBuiltinFieldTypes };
