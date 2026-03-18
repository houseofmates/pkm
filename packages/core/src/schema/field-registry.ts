/**
 * field type registry for the modular schema service
 * 
 * this module provides an extensible registry for field types.
 * field types define how data is validated, stored, and displayed.
 * new field types can be registered at runtime, enabling plugins
 * to add custom field types.
 */

import { z } from 'zod';
import type { FieldTypeDefinition, FieldDefinition } from './types';
import { secureLogger } from '@/lib/secure-logger';

/**
 * field registry class - manages all registered field types
 */
class FieldRegistry {
  // map of field type name to field type definition
  private fieldTypes: Map<string, FieldTypeDefinition> = new Map();

  /**
   * register a new field type
   * @param fieldType the field type definition to register
   * @throws error if field type is invalid or already registered (and overwrite is false)
   */
  public register(fieldType: FieldTypeDefinition, overwrite: boolean = false): void {
    // validate the field type definition
    if (!fieldType.typeName || typeof fieldType.typeName !== 'string') {
      throw new Error('field type must have a valid typeName');
    }

    if (!fieldType.label || typeof fieldType.label !== 'string') {
      throw new Error('field type must have a valid label');
    }

    if (!fieldType.schema || !(fieldType.schema instanceof z.ZodType)) {
      throw new Error('field type must have a valid zod schema');
    }

    // check if already registered
    if (this.fieldTypes.has(fieldType.typeName) && !overwrite) {
      throw new Error(`field type "${fieldType.typeName}" is already registered. use overwrite=true to replace.`);
    }

    this.fieldTypes.set(fieldType.typeName, fieldType);
  }

  /**
   * get a registered field type by name
   * @param typeName the name of the field type
   * @returns the field type definition or undefined if not found
   */
  public get(typeName: string): FieldTypeDefinition | undefined {
    return this.fieldTypes.get(typeName);
  }

  /**
   * check if a field type is registered
   * @param typeName the name of the field type
   * @returns true if the field type is registered
   */
  public has(typeName: string): boolean {
    return this.fieldTypes.has(typeName);
  }

  /**
   * get all registered field types
   * @returns array of all field type definitions
   */
  public getAll(): FieldTypeDefinition[] {
    return Array.from(this.fieldTypes.values());
  }

  /**
   * get all registered field type names
   * @returns array of all field type names
   */
  public getTypeNames(): string[] {
    return Array.from(this.fieldTypes.keys());
  }

  /**
   * unregister a field type
   * @param typeName the name of the field type to unregister
   * @returns true if the field type was removed, false if it didn't exist
   */
  public unregister(typeName: string): boolean {
    return this.fieldTypes.delete(typeName);
  }

  /**
   * clear all registered field types
   */
  public clear(): void {
    this.fieldTypes.clear();
  }

  /**
   * get the zod schema for a field definition
   * @param field the field definition
   * @returns the zod schema for this field
   * @throws error if the field type is not registered
   */
  public getSchemaForField(field: FieldDefinition): z.ZodType<any> {
    const fieldType = this.get(field.type);
    
    if (!fieldType) {
      throw new Error(`field type "${field.type}" is not registered for field "${field.name}"`);
    }

    let schema = fieldType.schema;

    // apply field-level validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        switch (rule.type) {
          case 'required':
            schema = schema.refine((val) => val !== null && val !== undefined && val !== '', {
              message: rule.message || `${field.label} is required`,
            });
            break;
          case 'min':
            if (typeof rule.value === 'number') {
              schema = (schema as any).min?.(rule.value, rule.message) || schema;
            }
            break;
          case 'max':
            if (typeof rule.value === 'number') {
              schema = (schema as any).max?.(rule.value, rule.message) || schema;
            }
            break;
          case 'regex':
            if (rule.value instanceof RegExp) {
              schema = (schema as z.ZodString).regex(rule.value, rule.message);
            }
            break;
        }
      }
    }

    // make optional if not required
    if (!field.required) {
      schema = schema.optional();
    }

    return schema;
  }

  /**
   * get the default value for a field
   * @param field the field definition
   * @returns the default value
   */
  public getDefaultValue(field: FieldDefinition): any {
    // use field-specific default if provided
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    // fall back to field type default
    const fieldType = this.get(field.type);
    if (fieldType?.defaultValue !== undefined) {
      return fieldType.defaultValue;
    }

    // return null as ultimate fallback
    return null;
  }

  /**
   * generate a zod object schema for a table based on its field definitions
   * @param fields array of field definitions
   * @returns zod object schema for validating records
   */
  public generateRecordSchema(fields: FieldDefinition[]): z.ZodObject<any> {
    const shape: { [key: string]: z.ZodType<any> } = {};

    for (const field of fields) {
      shape[field.name] = this.getSchemaForField(field);
    }

    return z.object(shape);
  }
}

// singleton instance
export const fieldRegistry = new FieldRegistry();

// ============================================================================
// built-in field type definitions
// ============================================================================

/**
 * register all built-in field types
 */
export function registerBuiltinFieldTypes(): void {
  // text field - simple string
  fieldRegistry.register({
    typeName: 'text',
    label: 'text',
    schema: z.string(),
    defaultValue: '',
    icon: 'type',
    description: 'single line text',
    sortable: true,
    filterable: true,
  });

  // number field - integer or float
  fieldRegistry.register({
    typeName: 'number',
    label: 'number',
    schema: z.number(),
    defaultValue: 0,
    icon: 'hash',
    description: 'numeric value',
    sortable: true,
    filterable: true,
  });

  // boolean field - true/false
  fieldRegistry.register({
    typeName: 'boolean',
    label: 'checkbox',
    schema: z.boolean(),
    defaultValue: false,
    icon: 'check-square',
    description: 'true or false value',
    sortable: true,
    filterable: true,
  });

  // date field - date only (no time)
  fieldRegistry.register({
    typeName: 'date',
    label: 'date',
    schema: z.string(), // iso date string
    defaultValue: '',
    icon: 'calendar',
    description: 'date without time',
    sortable: true,
    filterable: true,
  });

  // datetime field - date and time
  fieldRegistry.register({
    typeName: 'datetime',
    label: 'date & time',
    schema: z.string(), // iso datetime string
    defaultValue: '',
    icon: 'clock',
    description: 'date and time',
    sortable: true,
    filterable: true,
  });

  // email field - validated email string
  fieldRegistry.register({
    typeName: 'email',
    label: 'email',
    schema: z.string().email(),
    defaultValue: '',
    icon: 'mail',
    description: 'email address',
    sortable: true,
    filterable: true,
  });

  // url field - validated url string
  fieldRegistry.register({
    typeName: 'url',
    label: 'url',
    schema: z.string().url(),
    defaultValue: '',
    icon: 'link',
    description: 'web address',
    sortable: true,
    filterable: true,
  });

  // select field - single choice from options
  fieldRegistry.register({
    typeName: 'select',
    label: 'single select',
    schema: z.string(),
    defaultValue: '',
    icon: 'list',
    description: 'select one option from a list',
    sortable: true,
    filterable: true,
  });

  // multiselect field - multiple choices from options
  fieldRegistry.register({
    typeName: 'multiselect',
    label: 'multi select',
    schema: z.array(z.string()),
    defaultValue: [],
    icon: 'list-checks',
    description: 'select multiple options from a list',
    sortable: false,
    filterable: true,
  });

  // json field - arbitrary json data
  fieldRegistry.register({
    typeName: 'json',
    label: 'json',
    schema: z.any(),
    defaultValue: null,
    icon: 'braces',
    description: 'arbitrary json data',
    sortable: false,
    filterable: false,
  });

  // attachment field - file reference
  fieldRegistry.register({
    typeName: 'attachment',
    label: 'attachment',
    schema: z.object({
      url: z.string(),
      name: z.string().optional(),
      size: z.number().optional(),
      type: z.string().optional(),
    }),
    defaultValue: null,
    icon: 'paperclip',
    description: 'file attachment',
    sortable: false,
    filterable: true,
  });

  // relation field - link to another record
  fieldRegistry.register({
    typeName: 'relation',
    label: 'relation',
    schema: z.string(), // record id
    defaultValue: null,
    icon: 'link-2',
    description: 'link to another record',
    sortable: false,
    filterable: true,
  });

  secureLogger.info('registered', fieldRegistry.getTypeNames().length, 'built-in field types');
}
