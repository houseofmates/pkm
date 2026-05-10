import { describe, it, expect } from 'vitest';
import { schemaService, FieldInstance } from '@/services/schema.service';
import '@/services/field-types'; // This ensures the field types are registered before tests run

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
    ];

    // Expect the schema generation to throw an error because 'notAType' is not a known type
    expect(() => {
      schemaService.generateRecordSchema(invalidTableDefinition);
    }).toThrow('Field type "notAType" for field "unknownField" is not registered.');
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
