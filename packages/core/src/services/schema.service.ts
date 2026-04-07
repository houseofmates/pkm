import { z } from 'zod';
import { secureLogger } from '@/lib/secure-logger';

/* *
 * defines the structure for a field type definition.
 * each field type provides a zod schema for validation. */
export const FieldTypeSchema = z.object({
  // the programmatic name of the field type, e.g., "text", "number", "date"
  typeName: z.string(),
  // a zod schema that validates the data for this field type
  schema: z.instanceof(z.ZodType),
  // optional: a default value for this field type
  defaultValue: z.unknown().optional(),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;

/* *
 * defines the structure for a field's instance within a table schema.
 * this connects a column name to a registered field type. */
export const FieldInstanceSchema = z.object({
  name: z.string(), // the name of the column, e.g., "firstname", "age"
  type: z.string(),   // the typename of the registered fieldtype
});

export type FieldInstance = z.infer<typeof FieldInstanceSchema>;

/* *
 * a service for managing dynamic schemas.
 * it allows registering custom field types and generating zod schemas for entire records. */
class SchemaService {
  private fieldTypes: Map<string, FieldType> = new Map();

  /* *
   * registers a new field type that can be used in table schemas.
   * @param fieldtype the definition of the field type. */
  public registerFieldType(fieldType: FieldType) {
    if (this.fieldTypes.has(fieldType.typeName)) {
      secureLogger.warn(`Field type "${fieldType.typeName}" is already registered. Overwriting.`);
    }
    FieldTypeSchema.parse(fieldType); // validate the field type definition itself
    this.fieldTypes.set(fieldType.typeName, fieldType);
  }

  /* *
   * retrieves a registered field type by its name.
   * @param typename the name of the field type. */
  public getFieldType(typeName: string): FieldType | undefined {
    return this.fieldTypes.get(typeName);
  }

  /* *
   * generates a zod object schema for a record based on an array of field instances.
   * @param fields an array of field instances defining the table's structure.
   * @returns a zod schema that can be used to validate records. */
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