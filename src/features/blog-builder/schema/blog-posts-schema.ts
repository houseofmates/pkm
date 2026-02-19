// blog posts collection schema for nocobase
// this should be created in nocobase admin interface

export const blogPostsSchema = {
  name: 'blog_posts',
  title: 'Blog Posts',
  fields: [
  {
  name: 'id',
  type: 'bigInt',
  interface: 'id',
  primaryKey: true,
  autoIncrement: true,
  },
  {
  name: 'title',
  type: 'string',
  interface: 'input',
  required: true,
  uiSchema: {
 title: 'Post Title',
 type: 'string',
 'x-component': 'Input',
  },
  },
  {
  name: 'slug',
  type: 'string',
  interface: 'input',
  unique: true,
  uiSchema: {
 title: 'URL Slug',
 type: 'string',
 'x-component': 'Input',
 'x-component-props': {
 placeholder: 'auto-generated from title',
 },
  },
  },
  {
  name: 'banner_image',
  type: 'string',
  interface: 'url',
  uiSchema: {
 title: 'Banner Image URL',
 type: 'string',
 'x-component': 'Input',
  },
  },
  {
  name: 'content',
  type: 'json',
  interface: 'json',
  uiSchema: {
 title: 'Post Content (Page Elements)',
 type: 'object',
 'x-component': 'Input.JSON',
  },
  },
  {
  name: 'excerpt',
  type: 'text',
  interface: 'textarea',
  uiSchema: {
 title: 'Excerpt',
 type: 'string',
 'x-component': 'Input.TextArea',
 'x-component-props': {
 placeholder: 'auto-generated from content',
 },
  },
  },
  {
  name: 'published',
  type: 'boolean',
  interface: 'checkbox',
  defaultValue: false,
  uiSchema: {
 title: 'Published',
 type: 'boolean',
 'x-component': 'Checkbox',
  },
  },
  {
  name: 'published_date',
  type: 'date',
  interface: 'datetime',
  uiSchema: {
 title: 'Published Date',
 type: 'string',
 'x-component': 'DatePicker',
 'x-component-props': {
 showTime: true,
 },
  },
  },
  {
  name: 'tags',
  type: 'json',
  interface: 'json',
  uiSchema: {
 title: 'Tags',
 type: 'array',
 'x-component': 'Select',
 'x-component-props': {
 mode: 'tags',
 },
  },
  },
  {
  name: 'mood',
  type: 'string',
  interface: 'select',
  uiSchema: {
 title: 'Mood',
 type: 'string',
 'x-component': 'Select',
 enum: [
 { label: 'low', value: 'low' },
 { label: 'medium', value: 'medium' },
 { label: 'high', value: 'high' },
 { label: 'mixed', value: 'mixed' },
 ],
  },
  },
  {
  name: 'energy_level',
  type: 'string',
  interface: 'select',
  uiSchema: {
 title: 'Energy Level',
 type: 'string',
 'x-component': 'Select',
 enum: [
 { label: 'depleted', value: 'depleted' },
 { label: 'low', value: 'low' },
 { label: 'moderate', value: 'moderate' },
 { label: 'high', value: 'high' },
 ],
  },
  },
  {
  name: 'content_warnings',
  type: 'json',
  interface: 'json',
  uiSchema: {
 title: 'Content Warnings',
 type: 'array',
 'x-component': 'Select',
 'x-component-props': {
 mode: 'tags',
 },
  },
  },
  {
  name: 'author_headmate',
  type: 'string',
  interface: 'input',
  uiSchema: {
 title: 'Author (Headmate)',
 type: 'string',
 'x-component': 'Input',
  },
  },
  {
  name: 'reading_time',
  type: 'integer',
  interface: 'number',
  uiSchema: {
 title: 'Reading Time (minutes)',
 type: 'number',
 'x-component': 'InputNumber',
  },
  },
  {
  name: 'view_count',
  type: 'integer',
  interface: 'number',
  defaultValue: 0,
  uiSchema: {
 title: 'View Count',
 type: 'number',
 'x-component': 'InputNumber',
  },
  },
  {
  name: 'created_at',
  type: 'date',
  interface: 'createdAt',
  field: 'createdAt',
  },
  {
  name: 'updated_at',
  type: 'date',
  interface: 'updatedAt',
  field: 'updatedAt',
  },
  ],
};