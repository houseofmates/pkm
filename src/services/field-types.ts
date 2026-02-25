import { z } from 'zod';
import { schemaService } from './schema.service';
import type { FieldType } from './schema.service';

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

// Additional field types used by nocobase
const booleanField: FieldType = {
  typeName: 'boolean',
  schema: z.boolean().nullable(),
  defaultValue: false,
};

const dateField: FieldType = {
  typeName: 'date',
  schema: z.string().nullable(), // dates stored as ISO strings
  defaultValue: '',
};

const datetimeField: FieldType = {
  typeName: 'datetime',
  schema: z.string().nullable(),
  defaultValue: '',
};

const timeField: FieldType = {
  typeName: 'time',
  schema: z.string().nullable(),
  defaultValue: '',
};

const selectField: FieldType = {
  typeName: 'select',
  schema: z.string().nullable(),
  defaultValue: '',
};

const multipleSelectField: FieldType = {
  typeName: 'multipleSelect',
  schema: z.array(z.string()).nullable(),
  defaultValue: [],
};

const percentField: FieldType = {
  typeName: 'percent',
  schema: z.number().nullable(),
  defaultValue: 0,
};

const emailField: FieldType = {
  typeName: 'email',
  schema: z.string().nullable(),
  defaultValue: '',
};

const phoneField: FieldType = {
  typeName: 'phone',
  schema: z.string().nullable(),
  defaultValue: '',
};

const urlField: FieldType = {
  typeName: 'url',
  schema: z.string().nullable(),
  defaultValue: '',
};

const colorField: FieldType = {
  typeName: 'color',
  schema: z.string().nullable(),
  defaultValue: '#000000',
};

const jsonField: FieldType = {
  typeName: 'json',
  schema: z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
  ]).nullable(),
  defaultValue: null,
};

const attachmentField: FieldType = {
  typeName: 'attachment',
  schema: z.string().nullable(),
  defaultValue: '',
};

const attachmentsField: FieldType = {
  typeName: 'attachments',
  schema: z.array(z.object({ url: z.string().nullable() })).nullable(),
  defaultValue: [],
};

const formulaField: FieldType = {
  typeName: 'formula',
  schema: z.string().nullable(),
  defaultValue: '',
};

const relationField: FieldType = {
  typeName: 'relation',
  schema: z.object({
    id: z.string().or(z.number()),
    name: z.string().optional(),
    type: z.string().optional(),
  }).nullable(),
  defaultValue: null,
};

// register all of them
schemaService.registerFieldType(textField);
schemaService.registerFieldType(numberField);
schemaService.registerFieldType(booleanField);
schemaService.registerFieldType(dateField);
schemaService.registerFieldType(datetimeField);
schemaService.registerFieldType(timeField);
schemaService.registerFieldType(selectField);
schemaService.registerFieldType(multipleSelectField);
schemaService.registerFieldType(percentField);
schemaService.registerFieldType(emailField);
schemaService.registerFieldType(phoneField);
schemaService.registerFieldType(urlField);
schemaService.registerFieldType(colorField);
schemaService.registerFieldType(jsonField);
schemaService.registerFieldType(attachmentField);
schemaService.registerFieldType(attachmentsField);
schemaService.registerFieldType(formulaField);
schemaService.registerFieldType(relationField);

secureLogger.info('Default field types registered (text, number, boolean, date, datetime, time, select, multipleSelect, percent, email, phone, url, color, json, attachment, attachments, relation).');