import { z } from 'zod';
import { schemaService } from './schema.service';
import type { FieldType } from './schema.service';
import { secureLogger } from '@/lib/secure-logger';

/** * text field type
 * a simple string-based field.
 */
const textField: FieldType = {
  typeName: 'text',
  schema: z.string().nullable(),
  defaultValue: '',
};

/** * number field type
 * a numeric field that supports both integers and floats.
 */
const numberField: FieldType = {
  typeName: 'number',
  schema: z.number().nullable(),
  defaultValue: 0,
};

// additional field types used by nocobaseconst booleanField: FieldType = {
  typeName: 'boolean',
  schema: z.boolean().nullable(),
  defaultValue: false,
};

const dateField: FieldType = {
  typeName: 'date',
  schema: z.string().nullable(), // dates stored as iso strings
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

/** * link database field type
 * references another database/collection in the pkm system.
 * stores the database name and display info.
 */
const linkDatabaseField: FieldType = {
  typeName: 'linkDatabase',
  schema: z.object({
    id: z.string(), // the database/collection name
    name: z.string(), // display name
  }).nullable(),
  defaultValue: null,
};

/** * link item field type
 * references a specific item/record in any database, canvas, or document.
 * stores the item id, collection name, title, and item type.
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

// register all of themschemaService.registerFieldType(textField);
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
