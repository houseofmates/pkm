import { z } from 'zod';
import { schemaService, FieldInstance } from '../schema/schema.service';

// Defines the structure for a table, including its fields and records.
interface Table {
  name: string;
  fields: FieldInstance[];
  records: Map<string, Record<string, any>>;
  schema: z.ZodObject<any>;
}

/**
 * A service for managing and persisting data for dynamic tables.
 * It uses SchemaService to validate data on all operations.
 */
class DataService {
  private tables: Map<string, Table> = new Map();

  /**
   * Creates a new table with a given name and field structure.
   * @param name The name of the table.
   * @param fields The fields that define the table's schema.
   * @returns The newly created table definition.
   */
  public createTable(name: string, fields: FieldInstance[]): Table {
    if (this.tables.has(name)) {
      throw new Error(`Table "${name}" already exists.`);
    }

    const schema = schemaService.generateRecordSchema(fields);
    const newTable: Table = {
      name,
      fields,
      records: new Map(),
      schema,
    };

    this.tables.set(name, newTable);
    console.log(`Table "${name}" created successfully.`);
    return newTable;
  }

  /**
   * Adds a new record to a specified table.
   * The record is validated against the table's schema before insertion.
   * @param tableName The name of the table.
   * @param record The data to insert.
   * @returns The created record, including a unique ID.
   */
  public createRecord(tableName: string, record: Record<string, any>): Record<string, any> {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table "${tableName}" not found.`);
    }

    const validationResult = table.schema.safeParse(record);
    if (!validationResult.success) {
      // In a real app, you'd want more detailed error reporting.
      throw new Error(`Record validation failed: ${validationResult.error.message}`);
    }

    // Generate a unique ID for the record.
    const id = crypto.randomUUID();
    const newRecord = { id, ...validationResult.data };

    table.records.set(id, newRecord);
    return newRecord;
  }

  /**
   * Retrieves a record by its ID from a specified table.
   * @param tableName The name of the table.
   * @param id The ID of the record to retrieve.
   * @returns The found record or undefined.
   */
  public getRecord(tableName: string, id: string): Record<string, any> | undefined {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table "${tableName}" not found.`);
    }
    return table.records.get(id);
  }
}

export const dataService = new DataService();