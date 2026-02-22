import { z } from 'zod';
import { schemaService, FieldType } from './schema.service';

/**
 * Text Field Type
 * A simple string-based field.
 */
const textField: FieldType = {
  typeName: 'text',
  schema: z.string().nullable(),
  defaultValue: '',
};

/**
 * Number Field Type
 * A numeric field that supports both integers and floats.
 */
const numberField: FieldType = {
  typeName: 'number',
  schema: z.number().nullable(),
  defaultValue: 0,
};

// Register the default field types with the service
schemaService.registerFieldType(textField);
schemaService.registerFieldType(numberField);

console.log('Default field types (text, number) registered.');