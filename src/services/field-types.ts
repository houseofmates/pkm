import { z } from 'zod';
import { schemaService } from './schema.service';
import type { FieldType } from './schema.service';
import { secureLogger } from '@/lib/secure-logger';

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

/**
 * Link Database Field Type
 * References another database/collection in the PKM system.
 * Stores the database name and display info.
 */
const linkDatabaseField: FieldType = {
  typeName: 'linkDatabase',
  schema: z.object({
    id: z.string(), // the database/collection name
    name: z.string(), // display name
  }).nullable(),
  defaultValue: null,
};

/**
 * Link Item Field Type
 * References a specific item/record in any database, canvas, or document.
 * Stores the item id, collection name, title, and item type.
 */
const linkItemField: FieldType = {
  typeName: 'linkItem',
  schema: z.object({
    id: z.string().or(z.number()), // the item/record id
    collection: z.string(), // the collection/database name
    title: z.string(), // display title
    type: z.enum(['record', 'canvas', 'document']), // item type for routing
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
schemaService.registerFieldType(linkDatabaseField);
schemaService.registerFieldType(linkItemField);

secureLogger.info('Default field types registered (text, number, boolean, date, datetime, time, select, multipleSelect, percent, email, phone, url, color, json, attachment, attachments, relation, linkDatabase, linkItem).');
