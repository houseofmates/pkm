import { describe, it, expect, beforeEach } from 'vitest';
import { dataService } from './data.service';
import { FieldInstance } from '../schema/schema.service';
import '../schema/field-types'; // Ensures 'text' and 'number' are registered


describe('DataService', () => {

    // Define a simple table structure that will be used across tests.
    const userTableDefinition: FieldInstance[] = [
        { name: 'name', type: 'text' },
        { name: 'age', type: 'number' },
    ];

    const extendedTableDefinition: FieldInstance[] = [
        { name: 'flag', type: 'boolean' },
        { name: 'startedAt', type: 'date' },
    ];

    // Before each test, we'll create the 'users' table to ensure a clean state.
    beforeEach(() => {
        // A simple way to reset the service state for each test.
        // In a real application, you might need a more sophisticated reset method.
        (dataService as any).tables = new Map(); 
        dataService.createTable('users', userTableDefinition);
    });

    it('should create a record in a table with valid data', () => {
        const validUser = {
            name: 'Alice',
            age: 28,
        };

        const createdRecord = dataService.createRecord('users', validUser);

        // The created record should have an ID assigned.
        expect(createdRecord.id).toBeDefined();
        expect(createdRecord.name).toBe('Alice');
        expect(createdRecord.age).toBe(28);

        // We should be able to retrieve this record from the service.
        const retrievedRecord = dataService.getRecord('users', createdRecord.id);
        expect(retrievedRecord).toEqual(createdRecord);
    });

    it('should throw an error when creating a record with invalid data', () => {
        const invalidUser = {
            name: 'Bob',
            age: 'thirty', // 'age' should be a number.
        };

        // Expect the createRecord method to throw an error due to schema validation failure.
        expect(() => {
            dataService.createRecord('users', invalidUser);
        }).toThrow('Record validation failed');
    });

    it('should throw an error when creating a record for a non-existent table', () => {
        const userData = {
            name: 'Charlie',
            age: 35,
        };

        // We are trying to add a record to 'products', which does not exist.
        expect(() => {
            dataService.createRecord('products', userData);
        }).toThrow('Table "products" not found.');
    });

    it('should return undefined when retrieving a non-existent record', () => {
        const record = dataService.getRecord('users', 'non-existent-id');
        expect(record).toBeUndefined();
    });

    it('should not allow creating a table that already exists', () => {
        expect(() => {
            dataService.createTable('users', userTableDefinition);
        }).toThrow('Table "users" already exists.');
    });

    it('should validate additional field types when creating records', () => {
        dataService.createTable('extra', extendedTableDefinition);

        const valid = dataService.createRecord('extra', { flag: true, startedAt: '2023-01-01' });
        expect(valid.flag).toBe(true);
        expect(valid.startedAt).toBe('2023-01-01');

        expect(() => dataService.createRecord('extra', { flag: 'yes', startedAt: 123 })).toThrow('Record validation failed');
    });
});