/**
 * persistence service for the modular schema service
 * 
 * this module provides data persistence using indexeddb via the idb library.
 * it handles storing table definitions, records, and metadata.
 * all operations are async and support transactions.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { DBSchema } from 'idb';
import type { TableDefinition, Record, QueryOptions, QueryResult, FilterCondition, FilterGroup } from './types';

// database configuration
const DB_NAME = 'pkm_schema_db';
const DB_VERSION = 1;

// database schema definition
interface SchemaDB extends DBSchema {
  // store for table definitions (schemas)
  tables: {
    key: string; // table id
    value: TableDefinition;
    indexes: {
      'by-name': string; // table name (unique)
    };
  };
  
  // store for records - dynamic based on table
  records: {
    key: string; // record id
    value: Record;
    indexes: {
      'by-table': string; // table name
      'by-updated': string; // updatedAt timestamp
    };
  };
  
  // store for metadata/settings
  metadata: {
    key: string;
    value: any;
  };
}

/**
 * persistence service class - manages all data storage
 */
class PersistenceService {
  private db: IDBPDatabase<SchemaDB> | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * initialize the database connection
   */
  public async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    this.db = await openDB<SchemaDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // create object stores and indexes
        
        // tables store - holds table definitions
        if (!db.objectStoreNames.contains('tables')) {
          const tableStore = db.createObjectStore('tables', { keyPath: 'id' });
          tableStore.createIndex('by-name', 'name', { unique: true });
        }

        // records store - holds all records from all tables
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-table', 'tableName', { unique: false });
          recordStore.createIndex('by-updated', 'updatedAt', { unique: false });
        }

        // metadata store - holds app settings and metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });

    secureLogger.info('persistence service initialized - database:', DB_NAME, 'version:', DB_VERSION);
  }

  /**
   * ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<IDBPDatabase<SchemaDB>> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('failed to initialize database');
    }
    return this.db;
  }

  // ============================================================================
  // table operations
  // ============================================================================

  /**
   * save a table definition
   * @param table the table definition to save
   */
  public async saveTable(table: TableDefinition): Promise<void> {
    const db = await this.ensureInitialized();
    await db.put('tables', table);
  }

  /**
   * get a table definition by id
   * @param tableId the table id
   * @returns the table definition or undefined
   */
  public async getTable(tableId: string): Promise<TableDefinition | undefined> {
    const db = await this.ensureInitialized();
    return db.get('tables', tableId);
  }

  /**
   * get a table definition by name
   * @param tableName the table name
   * @returns the table definition or undefined
   */
  public async getTableByName(tableName: string): Promise<TableDefinition | undefined> {
    const db = await this.ensureInitialized();
    return db.getFromIndex('tables', 'by-name', tableName);
  }

  /**
   * get all table definitions
   * @returns array of all table definitions
   */
  public async getAllTables(): Promise<TableDefinition[]> {
    const db = await this.ensureInitialized();
    return db.getAll('tables');
  }

  /**
   * delete a table and all its records
   * @param tableId the table id to delete
   */
  public async deleteTable(tableId: string): Promise<void> {
    const db = await this.ensureInitialized();
    
    // get table to find its name
    const table = await db.get('tables', tableId);
    if (!table) return;

    // delete all records for this table
    const tx = db.transaction(['tables', 'records'], 'readwrite');
    const recordStore = tx.objectStore('records');
    const index = recordStore.index('by-table');
    const recordIds = await index.getAllKeys(table.name);
    
    for (const recordId of recordIds) {
      await recordStore.delete(recordId);
    }

    // delete the table definition
    await tx.objectStore('tables').delete(tableId);
    await tx.done;
  }

  // ============================================================================
  // record operations
  // ============================================================================

  /**
   * save a record
   * @param tableName the table this record belongs to
   * @param record the record to save
   */
  public async saveRecord(tableName: string, record: Record): Promise<void> {
    const db = await this.ensureInitialized();
    const recordWithTable = { ...record, tableName };
    await db.put('records', recordWithTable);
  }

  /**
   * get a record by id
   * @param recordId the record id
   * @returns the record or undefined
   */
  public async getRecord(recordId: string): Promise<Record | undefined> {
    const db = await this.ensureInitialized();
    return db.get('records', recordId);
  }

  /**
   * get all records for a table
   * @param tableName the table name
   * @returns array of records
   */
  public async getRecordsByTable(tableName: string): Promise<Record[]> {
    const db = await this.ensureInitialized();
    const index = db.transaction('records').store.index('by-table');
    return index.getAll(tableName);
  }

  /**
   * delete a record
   * @param recordId the record id to delete
   */
  public async deleteRecord(recordId: string): Promise<void> {
    const db = await this.ensureInitialized();
    await db.delete('records', recordId);
  }

  /**
   * query records with filtering, sorting, and pagination
   * @param tableName the table to query
   * @param options query options
   * @returns query result with records and pagination info
   */
  public async queryRecords(tableName: string, options: QueryOptions = {}): Promise<QueryResult> {
    const db = await this.ensureInitialized();
    
    // get all records for this table
    let records = await this.getRecordsByTable(tableName);

    // apply filters
    if (options.filter) {
      records = records.filter(record => this.matchesFilter(record, options.filter!));
    }

    // get total count before pagination
    const total = records.length;

    // apply sorting
    if (options.sort && options.sort.length > 0) {
      records = this.sortRecords(records, options.sort);
    }

    // apply pagination
    const page = options.page || 1;
    const pageSize = options.pageSize || 100;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRecords = records.slice(startIndex, endIndex);

    // apply field selection
    const finalRecords = paginatedRecords.map(record => {
      if (options.fields) {
        // include only specified fields
        const filtered: Record = { ...record };
        const allFields = Object.keys(record);
        for (const field of allFields) {
          if (!options.fields.includes(field) && 
              !['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'tableName'].includes(field)) {
            delete filtered[field];
          }
        }
        return filtered;
      }
      
      if (options.excludeFields) {
        // exclude specified fields
        const filtered: Record = { ...record };
        for (const field of options.excludeFields) {
          delete filtered[field];
        }
        return filtered;
      }
      
      return record;
    });

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return {
      records: finalRecords,
      total,
      page,
      pageSize,
      totalPages,
      hasMore,
    };
  }

  /**
   * check if a record matches a filter condition or group
   */
  private matchesFilter(record: Record, filter: FilterCondition | FilterGroup): boolean {
    // check if it's a filter group
    if ('conditions' in filter) {
      const group = filter as FilterGroup;
      const results = group.conditions.map(condition => this.matchesFilter(record, condition));
      
      if (group.operator === 'and') {
        return results.every(r => r);
      } else {
        return results.some(r => r);
      }
    }

    // it's a single condition
    const condition = filter as FilterCondition;
    const value = record[condition.field];
    
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lt':
        return value < condition.value;
      case 'lte':
        return value <= condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(condition.value));
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(String(condition.value));
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'empty':
        return value === null || value === undefined || value === '';
      case 'notEmpty':
        return value !== null && value !== undefined && value !== '';
      case 'between':
        return Array.isArray(condition.value) && 
               condition.value.length === 2 &&
               value >= condition.value[0] && 
               value <= condition.value[1];
      default:
        return true;
    }
  }

  /**
   * sort records by sort specifications
   */
  private sortRecords(records: Record[], sortSpecs: { field: string; direction?: 'asc' | 'desc' }[]): Record[] {
    return [...records].sort((a, b) => {
      for (const spec of sortSpecs) {
        const aVal = a[spec.field];
        const bVal = b[spec.field];
        
        let comparison = 0;
        
        if (aVal === null || aVal === undefined) {
          comparison = bVal === null || bVal === undefined ? 0 : 1;
        } else if (bVal === null || bVal === undefined) {
          comparison = -1;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        if (comparison !== 0) {
          return spec.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  // ============================================================================
  // metadata operations
  // ============================================================================

  /**
   * get metadata value
   * @param key the metadata key
   * @returns the metadata value or undefined
   */
  public async getMetadata(key: string): Promise<any> {
    const db = await this.ensureInitialized();
    return db.get('metadata', key);
  }

  /**
   * set metadata value
   * @param key the metadata key
   * @param value the value to store
   */
  public async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.ensureInitialized();
    await db.put('metadata', value, key);
  }

  /**
   * delete metadata
   * @param key the metadata key to delete
   */
  public async deleteMetadata(key: string): Promise<void> {
    const db = await this.ensureInitialized();
    await db.delete('metadata', key);
  }

  // ============================================================================
  // utility operations
  // ============================================================================

  /**
   * clear all data (use with caution!)
   */
  public async clearAll(): Promise<void> {
    const db = await this.ensureInitialized();
    const tx = db.transaction(['tables', 'records', 'metadata'], 'readwrite');
    await tx.objectStore('tables').clear();
    await tx.objectStore('records').clear();
    await tx.objectStore('metadata').clear();
    await tx.done;
    secureLogger.info('all data cleared from database');
  }

  /**
   * close the database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * export all data as json (for backup)
   * @returns object containing all tables and records
   */
  public async exportAll(): Promise<{ tables: TableDefinition[]; records: Record[] }> {
    const db = await this.ensureInitialized();
    const tables = await db.getAll('tables');
    const records = await db.getAll('records');
    return { tables, records };
  }

  /**
   * import data from json (for restore)
   * @param data the data to import
   */
  public async importAll(data: { tables: TableDefinition[]; records: Record[] }): Promise<void> {
    const db = await this.ensureInitialized();
    
    const tx = db.transaction(['tables', 'records'], 'readwrite');
    
    // clear existing data
    await tx.objectStore('tables').clear();
    await tx.objectStore('records').clear();
    
    // import tables
    for (const table of data.tables) {
      await tx.objectStore('tables').put(table);
    }
    
    // import records
    for (const record of data.records) {
      await tx.objectStore('records').put(record);
    }
    
    await tx.done;
    secureLogger.info('data imported successfully:', data.tables.length, 'tables,', data.records.length, 'records');
  }
}

// singleton instance
export const persistenceService = new PersistenceService();
