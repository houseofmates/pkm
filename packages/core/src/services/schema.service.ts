import { z } from 'zod';
import { secureLogger } from '@/lib/secure-logger';

/**
 * Defines the structure for a field type definition.
 * Each field type provides a Zod schema for validation.
 */
export const FieldTypeSchema = z.object({
  // The programmatic name of the field type, e.g., "text", "number", "date"
  typeName: z.string(),
  // A Zod schema that validates the data for this field type
  schema: z.instanceof(z.ZodType),
  // Optional: A default value for this field type
  defaultValue: z.unknown().optional(),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;

/**
 * Defines the structure for a field's instance within a table schema.
 * This connects a column name to a registered field type.
 */
export const FieldInstanceSchema = z.object({
  name: z.string(), // The name of the column, e.g., "firstName", "age"
  type: z.string(),   // The typeName of the registered FieldType
});

export type FieldInstance = z.infer<typeof FieldInstanceSchema>;

/**
 * A service for managing dynamic schemas.
 * It allows registering custom field types and generating Zod schemas for entire records.
 */
class SchemaService {
  private fieldTypes: Map<string, FieldType> = new Map();

  /**
   * Registers a new field type that can be used in table schemas.
   * @param fieldType The definition of the field type.
   */
  public registerFieldType(fieldType: FieldType) {
    if (this.fieldTypes.has(fieldType.typeName)) {
      secureLogger.warn(`Field type "${fieldType.typeName}" is already registered. Overwriting.`);
    }
    FieldTypeSchema.parse(fieldType); // Validate the field type definition itself
    this.fieldTypes.set(fieldType.typeName, fieldType);
  }

  /**
   * Retrieves a registered field type by its name.
   * @param typeName The name of the field type.
   */
  public getFieldType(typeName: string): FieldType | undefined {
    return this.fieldTypes.get(typeName);
  }

  /**
   * Generates a Zod object schema for a record based on an array of field instances.
   * @param fields An array of field instances defining the table's structure.
   * @returns A Zod schema that can be used to validate records.
   */
  public generateRecordSchema(fields: FieldInstance[]): z.ZodObject<any> {
    const shape: { [key: string]: z.ZodType } = {};

    for (const field of fields) {
      const fieldType = this.fieldTypes.get(field.type);
      if (!fieldType) {
        throw new Error(`Field type "${field.type}" for field "${field.name}" is not registered.`);
      }
      shape[field.name] = fieldType.schema;
    }

    return z.object(shape);
  }
}

export const schemaService = new SchemaService();