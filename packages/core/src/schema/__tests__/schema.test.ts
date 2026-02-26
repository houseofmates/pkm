/**
 * schema service tests
 * 
 * these tests verify that the modular schema service can:
 * - create dynamic tables with various field types
 * - persist data to indexeddb
 * - validate records against schemas
 * - query records with filters and sorting
 * 
 * uses fake-indexeddb for testing without a real browser environment.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { z } from 'zod';
import { schemaService, fieldRegistry, persistenceService } from '../index';
import type { TableDefinition, Record } from '../index';

describe('schema service', () => {
  // initialize before all tests
  beforeAll(async () => {
    await schemaService.initialize();
  });

  // clear data before each test
  beforeEach(async () => {
    await schemaService.clearAll();
  });

  // close database after all tests
  afterAll(async () => {
    await persistenceService.close();
  });

  describe('table management', () => {
    it('should create a table with text and number fields', async () => {
      // create a table with text and number fields
      const table = await schemaService.createTable(
        'products',
        'products',
        [
          {
            name: 'name',
            type: 'text',
            label: 'product name',
            required: true,
          },
          {
            name: 'price',
            type: 'number',
            label: 'price',
            required: true,
          },
          {
            name: 'description',
            type: 'text',
            label: 'description',
            required: false,
          },
        ],
        { color: '#3b82f6', icon: 'package', archived: false }
      );

      // verify table was created
      expect(table).toBeDefined();
      expect(table.name).toBe('products');
      expect(table.label).toBe('products');
      expect(table.fields).toHaveLength(3);
      expect(table.version).toBe(1);
      expect(table.metadata?.color).toBe('#3b82f6');
      expect(table.metadata?.icon).toBe('package');

      // verify fields
      const nameField = table.fields.find(f => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField?.type).toBe('text');
      expect(nameField?.required).toBe(true);

      const priceField = table.fields.find(f => f.name === 'price');
      expect(priceField).toBeDefined();
      expect(priceField?.type).toBe('number');
      expect(priceField?.required).toBe(true);

      const descField = table.fields.find(f => f.name === 'description');
      expect(descField).toBeDefined();
      expect(descField?.type).toBe('text');
      expect(descField?.required).toBe(false);
    });

    it('should persist table to indexeddb and retrieve it', async () => {
      // create a table
      await schemaService.createTable('users', 'users', [
        { name: 'username', type: 'text', label: 'username', required: true },
        { name: 'age', type: 'number', label: 'age', required: false },
      ]);

      // retrieve the table
      const retrieved = await schemaService.getTable('users');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('users');
      expect(retrieved?.fields).toHaveLength(2);

      // get all tables
      const allTables = await schemaService.getAllTables();
      expect(allTables).toHaveLength(1);
      expect(allTables[0].name).toBe('users');
    });

    it('should not allow duplicate table names', async () => {
      // create first table
      await schemaService.createTable('items', 'items', [
        { name: 'title', type: 'text', label: 'title' },
      ]);

      // try to create second table with same name
      await expect(
        schemaService.createTable('items', 'items', [
          { name: 'name', type: 'text', label: 'name' },
        ])
      ).rejects.toThrow('table "items" already exists');
    });

    it('should update table schema', async () => {
      // create table
      await schemaService.createTable('tasks', 'tasks', [
        { name: 'title', type: 'text', label: 'title' },
      ]);

      // update table
      const updated = await schemaService.updateTable('tasks', {
        label: 'my tasks',
        metadata: { color: '#ef4444', archived: false },
      });

      expect(updated.label).toBe('my tasks');
      expect(updated.metadata?.color).toBe('#ef4444');
      expect(updated.version).toBe(2);
    });

    it('should delete table and all its records', async () => {
      // create table and add a record
      await schemaService.createTable('temp', 'temp', [
        { name: 'value', type: 'text', label: 'value' },
      ]);
      await schemaService.createRecord('temp', { value: 'test' });

      // delete table
      await schemaService.deleteTable('temp');

      // verify table is gone
      const retrieved = await schemaService.getTable('temp');
      expect(retrieved).toBeUndefined();

      // verify records are gone
      const records = await schemaService.getAllRecords('temp');
      expect(records).toHaveLength(0);
    });
  });

  describe('field management', () => {
    it('should add field to existing table', async () => {
      // create table
      await schemaService.createTable('projects', 'projects', [
        { name: 'name', type: 'text', label: 'project name' },
      ]);

      // add field
      const updated = await schemaService.addField('projects', {
        name: 'deadline',
        type: 'date',
        label: 'deadline',
        required: false,
      });

      expect(updated.fields).toHaveLength(2);
      const deadlineField = updated.fields.find(f => f.name === 'deadline');
      expect(deadlineField?.type).toBe('date');
    });

    it('should remove field from table', async () => {
      // create table
      const table = await schemaService.createTable('notes', 'notes', [
        { name: 'title', type: 'text', label: 'title' },
        { name: 'content', type: 'text', label: 'content' },
      ]);

      // get content field id
      const contentField = table.fields.find(f => f.name === 'content');
      expect(contentField).toBeDefined();

      // remove field
      const updated = await schemaService.removeField('notes', contentField!.id);
      expect(updated.fields).toHaveLength(1);
      expect(updated.fields[0].name).toBe('title');
    });

    it('should reject unregistered field types', async () => {
      await expect(
        schemaService.createTable('invalid', 'invalid', [
          { name: 'field', type: 'nonexistent', label: 'field' },
        ])
      ).rejects.toThrow('field type "nonexistent" is not registered');
    });
  });

  describe('record operations', () => {
    beforeEach(async () => {
      // create test table before each record test
      await schemaService.createTable('test_records', 'test records', [
        { name: 'title', type: 'text', label: 'title', required: true },
        { name: 'count', type: 'number', label: 'count', required: false },
        { name: 'active', type: 'boolean', label: 'active', required: false },
      ]);
    });

    it('should create and retrieve a record', async () => {
      // create record
      const record = await schemaService.createRecord('test_records', {
        title: 'test item',
        count: 42,
        active: true,
      });

      // verify record structure
      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBeDefined();
      expect(record.updatedAt).toBeDefined();
      expect(record.title).toBe('test item');
      expect(record.count).toBe(42);
      expect(record.active).toBe(true);

      // retrieve record
      const retrieved = await schemaService.getRecord(record.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('test item');
      expect(retrieved?.count).toBe(42);
    });

    it('should apply default values for missing fields', async () => {
      // create record with only required field
      const record = await schemaService.createRecord('test_records', {
        title: 'minimal record',
      });

      // verify defaults applied
      expect(record.title).toBe('minimal record');
      expect(record.count).toBe(0); // number default
      expect(record.active).toBe(false); // boolean default
    });

    it('should validate records against schema', async () => {
      // try to create record without required field
      await expect(
        schemaService.createRecord('test_records', {
          count: 10,
        })
      ).rejects.toThrow('validation failed');
    });

    it('should update a record', async () => {
      // create record
      const record = await schemaService.createRecord('test_records', {
        title: 'original',
        count: 1,
      });

      // update record
      const updated = await schemaService.updateRecord('test_records', record.id, {
        title: 'updated',
        count: 100,
      });

      expect(updated.title).toBe('updated');
      expect(updated.count).toBe(100);
      expect(updated.id).toBe(record.id); // id unchanged
      expect(updated.createdAt).toBe(record.createdAt); // createdAt unchanged
      expect(updated.updatedAt).not.toBe(record.updatedAt); // updatedAt changed
    });

    it('should delete a record', async () => {
      // create record
      const record = await schemaService.createRecord('test_records', {
        title: 'to delete',
      });

      // delete record
      await schemaService.deleteRecord(record.id);

      // verify record is gone
      const retrieved = await schemaService.getRecord(record.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get all records from a table', async () => {
      // create multiple records
      await schemaService.createRecord('test_records', { title: 'first' });
      await schemaService.createRecord('test_records', { title: 'second' });
      await schemaService.createRecord('test_records', { title: 'third' });

      // get all records
      const records = await schemaService.getAllRecords('test_records');
      expect(records).toHaveLength(3);
    });
  });

  describe('query operations', () => {
    beforeEach(async () => {
      // create test table with sample data
      await schemaService.createTable('inventory', 'inventory', [
        { name: 'name', type: 'text', label: 'name' },
        { name: 'quantity', type: 'number', label: 'quantity' },
        { name: 'category', type: 'text', label: 'category' },
      ]);

      // add sample records
      await schemaService.createRecord('inventory', {
        name: 'apple',
        quantity: 10,
        category: 'fruit',
      });
      await schemaService.createRecord('inventory', {
        name: 'banana',
        quantity: 5,
        category: 'fruit',
      });
      await schemaService.createRecord('inventory', {
        name: 'carrot',
        quantity: 20,
        category: 'vegetable',
      });
      await schemaService.createRecord('inventory', {
        name: 'broccoli',
        quantity: 15,
        category: 'vegetable',
      });
    });

    it('should filter records by equality', async () => {
      const result = await schemaService.queryRecords('inventory', {
        filter: { field: 'category', operator: 'eq', value: 'fruit' },
      });

      expect(result.records).toHaveLength(2);
      expect(result.records.every(r => r.category === 'fruit')).toBe(true);
    });

    it('should filter records by greater than', async () => {
      const result = await schemaService.queryRecords('inventory', {
        filter: { field: 'quantity', operator: 'gt', value: 10 },
      });

      expect(result.records).toHaveLength(2); // carrot (20) and broccoli (15)
      expect(result.records.every((r: any) => r.quantity > 10)).toBe(true);
    });

    it('should filter records with contains', async () => {
      const result = await schemaService.queryRecords('inventory', {
        filter: { field: 'name', operator: 'contains', value: 'a' },
      });

      // apple, banana, carrot all contain 'a'
      expect(result.records.length).toBeGreaterThanOrEqual(3);
    });

    it('should sort records', async () => {
      const result = await schemaService.queryRecords('inventory', {
        sort: [{ field: 'quantity', direction: 'asc' }],
      });

      // check ascending order
      const quantities = result.records.map((r: any) => r.quantity);
      for (let i = 1; i < quantities.length; i++) {
        expect(quantities[i]).toBeGreaterThanOrEqual(quantities[i - 1]);
      }
    });

    it('should paginate results', async () => {
      const result = await schemaService.queryRecords('inventory', {
        page: 1,
        pageSize: 2,
      });

      expect(result.records).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should combine filter and sort', async () => {
      const result = await schemaService.queryRecords('inventory', {
        filter: { field: 'category', operator: 'eq', value: 'vegetable' },
        sort: [{ field: 'quantity', direction: 'desc' }],
      });

      expect(result.records).toHaveLength(2);
      expect(result.records[0].name).toBe('carrot'); // 20 quantity
      expect(result.records[1].name).toBe('broccoli'); // 15 quantity
    });
  });

  describe('field registry', () => {
    it('should have built-in field types registered', () => {
      const types = fieldRegistry.getTypeNames();
      expect(types).toContain('text');
      expect(types).toContain('number');
      expect(types).toContain('boolean');
      expect(types).toContain('date');
      expect(types).toContain('email');
      expect(types).toContain('url');
      expect(types).toContain('select');
      expect(types).toContain('multiselect');
      expect(types).toContain('json');
      expect(types).toContain('attachment');
      expect(types).toContain('relation');
    });

      it('should allow registering custom field types', () => {
  // register a custom field type
  fieldRegistry.register({
    typeName: 'percentage',
    label: 'percentage',
    schema: z.number().min(0).max(100),
    defaultValue: 0,
    icon: 'percent',
    description: 'value between 0 and 100',
  });

  expect(fieldRegistry.has('percentage')).toBe(true);

  // clean up
  fieldRegistry.unregister('percentage');
});


    it('should generate validation schema for fields', () => {
      const fields = [
        { id: '1', name: 'name', type: 'text', label: 'name', required: true },
        { id: '2', name: 'age', type: 'number', label: 'age', required: false },
      ];

      const schema = fieldRegistry.generateRecordSchema(fields);
      expect(schema).toBeInstanceOf(z.ZodObject);
    });
  });

  describe('data export and import', () => {
    it('should export and import all data', async () => {
      // create table and records
      await schemaService.createTable('export_test', 'export test', [
        { name: 'data', type: 'text', label: 'data' },
      ]);
      await schemaService.createRecord('export_test', { data: 'record 1' });
      await schemaService.createRecord('export_test', { data: 'record 2' });

      // export all data
      const exported = await schemaService.exportAll();
      expect(exported.tables).toHaveLength(1);
      expect(exported.records).toHaveLength(2);

      // clear all data
      await schemaService.clearAll();

      // verify data is cleared
      const tables = await schemaService.getAllTables();
      expect(tables).toHaveLength(0);

      // import data back
      await schemaService.importAll(exported);

      // verify data is restored
      const restoredTables = await schemaService.getAllTables();
      expect(restoredTables).toHaveLength(1);
      const restoredRecords = await schemaService.getAllRecords('export_test');
      expect(restoredRecords).toHaveLength(2);
    });
  });
});
