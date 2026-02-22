import { describe, it, expect } from 'vitest';
import { schemaService } from '@/services/schema.service';
import type { FieldInstance, FieldType } from '@/services/schema.service';
import '@/services/field-types'; // This ensures the field types are registered before tests run

import { z } from 'zod';

beforeAll(() => {
  const textField: FieldType = { typeName: 'text', schema: z.string().nullable(), defaultValue: '' };
  const numberField: FieldType = { typeName: 'number', schema: z.number().nullable(), defaultValue: 0 };
  schemaService.registerFieldType(textField);
  schemaService.registerFieldType(numberField);
});


describe('SchemaService', () => {

  it('should generate a Zod schema for a dynamic table and validate records', () => {
    // 1. Define the structure of our dynamic table
    const userProfileTable: FieldInstance[] = [
      { name: 'username', type: 'text' },
      { name: 'age', type: 'number' },
      { name: 'bio', type: 'text' },
    ];

    // 2. Generate the Zod schema from this structure
    const UserProfileSchema = schemaService.generateRecordSchema(userProfileTable);

    // 3. Define a valid record and an invalid record
    const validUser = {
      username: 'john_doe',
      age: 30,
      bio: 'Software developer and adventurer.',
    };

    const invalidUser = {
      username: 'jane_doe',
      age: 'twenty-five', // Invalid type for age
      bio: null, // Bio should be a string, but we allow nullables
    };

    // 4. Validate the records and assert the results
    const validResult = UserProfileSchema.safeParse(validUser);
    const invalidResult = UserProfileSchema.safeParse(invalidUser);

    // The valid user should pass validation
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data).toEqual(validUser);
    }

    // The invalid user should fail validation
    expect(invalidResult.success).toBe(false);
  });

  it('should throw an error for unregistered field types', () => {
    const invalidTableDefinition: FieldInstance[] = [
      { name: 'unknownField', type: 'notAType' },
      { name: 'isVerified', type: 'boolean' },
    ];

    // Expect the schema generation to throw an error because the type is not registered
    expect(() => {
      schemaService.generateRecordSchema(invalidTableDefinition);
    }).toThrow('Field type "notAType" for field "unknownField" is not registered.');
  });

  it('should validate records with a wide variety of field types', () => {
    const mixedTable: FieldInstance[] = [
      { name: 'aText', type: 'text' },
      { name: 'aNumber', type: 'number' },
      { name: 'aBool', type: 'boolean' },
      { name: 'aDate', type: 'date' },
      { name: 'aDatetime', type: 'datetime' },
      { name: 'aTime', type: 'time' },
      { name: 'aSelect', type: 'select' },
      { name: 'aMulti', type: 'multipleSelect' },
      { name: 'aPercent', type: 'percent' },
      { name: 'anEmail', type: 'email' },
      { name: 'aPhone', type: 'phone' },
      { name: 'aUrl', type: 'url' },
      { name: 'aColor', type: 'color' },
      { name: 'aJson', type: 'json' },
      { name: 'anAttachment', type: 'attachment' },
      { name: 'attachments', type: 'attachments' },
      { name: 'aRelation', type: 'relation' },
    ];

    const MixedSchema = schemaService.generateRecordSchema(mixedTable);

    const validRecord = {
      aText: 'hello',
      aNumber: 123,
      aBool: true,
      aDate: '2022-01-01',
      aDatetime: '2022-01-01T12:00:00',
      aTime: '12:00',
      aSelect: 'opt',
      aMulti: ['opt1', 'opt2'],
      aPercent: 50,
      anEmail: 'test@example.com',
      aPhone: '1234567890',
      aUrl: 'https://example.com',
      aColor: '#ff0000',
      aJson: { foo: 'bar' },
      anAttachment: 'http://foo',
      attachments: [{ url: 'http://bar' }],
      aRelation: { id: 1 },
    };

    const invalidRecord = {
      aText: null,
      aNumber: 'nope',
      aBool: 'yes',
      aDate: 123,
      aDatetime: 456,
      aTime: 789,
      aSelect: null,
      aMulti: 'notarray',
      aPercent: 'fifty',
      anEmail: 123,
      aPhone: false,
      aUrl: 999,
      aColor: 0,
      aJson: 'not json',
      anAttachment: 123,
      attachments: 'string',
      aRelation: 42,
    };

    expect(MixedSchema.safeParse(validRecord).success).toBe(true);
    expect(MixedSchema.safeParse(invalidRecord).success).toBe(false);
  });

  it('should handle nullable values correctly based on field type schemas', () => {
    const contactTable: FieldInstance[] = [
        { name: 'name', type: 'text' },
        { name: 'phone', type: 'number' },
    ];

    const ContactSchema = schemaService.generateRecordSchema(contactTable);

    const contactWithNulls = {
        name: null,
        phone: null,
    };

    const result = ContactSchema.safeParse(contactWithNulls);
    expect(result.success).toBe(true);
    if(result.success) {
        expect(result.data).toEqual(contactWithNulls);
    }
  });
});