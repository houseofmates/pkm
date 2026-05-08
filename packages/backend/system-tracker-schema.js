/**
 * system tracker - nocobase collection schemas
 * defines all collections needed for the pkm system tracker
 */

export const SYSTEM_TRACKER_COLLECTIONS = {
  headmates: {
    name: 'headmates',
    title: 'headmates',
    fields: [
      { name: 'name', type: 'string', uiSchema: { title: 'name', required: true } },
      { name: 'pronouns', type: 'string', uiSchema: { title: 'pronouns' } },
      { name: 'color', type: 'string', uiSchema: { title: 'color', type: 'color' } },
      { name: 'textColor', type: 'string', uiSchema: { title: 'text color', type: 'color' } },
      { name: 'description', type: 'text', uiSchema: { title: 'description', type: 'textarea' } },
      { name: 'role', type: 'string', uiSchema: { title: 'role' } },
      { name: 'status', type: 'string', uiSchema: { title: 'status', enum: [{label:'active',value:'active'},{label:'dormant',value:'dormant'},{label:'system',value:'system'}] } },
      { name: 'birthday', type: 'date', uiSchema: { title: 'birthday' } },
      { name: 'avatar_url', type: 'string', uiSchema: { title: 'avatar url' } },
      { name: 'banner_url', type: 'string', uiSchema: { title: 'banner url' } },
      { name: 'triggers', type: 'text', uiSchema: { title: 'triggers' } },
      { name: 'preferences', type: 'json', uiSchema: { title: 'preferences' } },
      { name: 'creation_source', type: 'string', uiSchema: { title: 'source' } },
      { name: 'is_introject', type: 'boolean', uiSchema: { title: 'is introject' } },
      { name: 'introject_source', type: 'string', uiSchema: { title: 'introject source' } },
      { name: 'simply_plural_id', type: 'string', uiSchema: { title: 'simply plural id' } },
      { name: 'created_at', type: 'date', uiSchema: { title: 'created' } },
      { name: 'updated_at', type: 'date', uiSchema: { title: 'updated' } },
    ]
  },

  front_history: {
    name: 'front_history',
    title: 'front history',
    fields: [
      { name: 'startTime', type: 'datetime', uiSchema: { title: 'start time', required: true } },
      { name: 'endTime', type: 'datetime', uiSchema: { title: 'end time' } },
      { name: 'members', type: 'json', uiSchema: { title: 'members' } },
      { name: 'depth', type: 'integer', uiSchema: { title: 'depth' } },
      { name: 'comment', type: 'text', uiSchema: { title: 'comment', type: 'textarea' } },
      { name: 'duration', type: 'integer', uiSchema: { title: 'duration (seconds)' } },
      { name: 'is_active', type: 'boolean', uiSchema: { title: 'is active' } },
      { name: 'trigger', type: 'string', uiSchema: { title: 'trigger' } },
      { name: 'location', type: 'string', uiSchema: { title: 'location' } },
      { name: 'mood', type: 'string', uiSchema: { title: 'mood' } },
      { name: 'energy_level', type: 'integer', uiSchema: { title: 'energy level' } },
      { name: 'created_at', type: 'datetime', uiSchema: { title: 'created' } },
    ]
  },

  headmate_connections: {
    name: 'headmate_connections',
    title: 'headmate connections',
    fields: [
      { name: 'from_headmate', type: 'belongsTo', target: 'headmates', uiSchema: { title: 'from headmate', required: true } },
      { name: 'to_headmate', type: 'belongsTo', target: 'headmates', uiSchema: { title: 'to headmate', required: true } },
      { name: 'relationship_type', type: 'string', uiSchema: { title: 'type', enum: [
        {label:'romantic',value:'romantic'},
        {label:'familial',value:'familial'},
        {label:'friendship',value:'friendship'},
        {label:'protective',value:'protective'},
        {label:'sibling',value:'sibling'},
        {label:'parental',value:'parental'},
        {label:'child',value:'child'},
        {label:'mentor',value:'mentor'},
        {label:'rival',value:'rival'},
        {label:'indifferent',value:'indifferent'},
        {label:'conflicted',value:'conflicted'},
        {label:'trauma bond',value:'trauma_bond'},
        {label:'other',value:'other'},
      ]}},
      { name: 'strength', type: 'integer', uiSchema: { title: 'strength (1-10)' } },
      { name: 'is_mutual', type: 'boolean', uiSchema: { title: 'mutual' } },
      { name: 'notes', type: 'text', uiSchema: { title: 'notes', type: 'textarea' } },
      { name: 'style', type: 'json', uiSchema: { title: 'visual style' } },
      { name: 'created_at', type: 'datetime', uiSchema: { title: 'created' } },
      { name: 'updated_at', type: 'datetime', uiSchema: { title: 'updated' } },
    ]
  },

  headmate_notes: {
    name: 'headmate_notes',
    title: 'headmate notes',
    fields: [
      { name: 'headmate', type: 'belongsTo', target: 'headmates', uiSchema: { title: 'headmate', required: true } },
      { name: 'title', type: 'string', uiSchema: { title: 'title', required: true } },
      { name: 'content', type: 'text', uiSchema: { title: 'content', type: 'markdown' } },
      { name: 'tags', type: 'array', uiSchema: { title: 'tags' } },
      { name: 'visibility', type: 'string', uiSchema: { title: 'visibility', enum: [{label:'private',value:'private'},{label:'shared',value:'shared'},{label:'public',value:'public'}] } },
      { name: 'is_pinned', type: 'boolean', uiSchema: { title: 'pinned' } },
      { name: 'created_at', type: 'datetime', uiSchema: { title: 'created' } },
      { name: 'updated_at', type: 'datetime', uiSchema: { title: 'updated' } },
    ]
  },

  inner_world_scenes: {
    name: 'inner_world_scenes',
    title: 'inner world scenes',
    fields: [
      { name: 'name', type: 'string', uiSchema: { title: 'name', required: true } },
      { name: 'description', type: 'text', uiSchema: { title: 'description', type: 'textarea' } },
      { name: 'image_url', type: 'string', uiSchema: { title: 'image url' } },
      { name: 'image_prompt', type: 'text', uiSchema: { title: 'image prompt' } },
      { name: 'headmates', type: 'hasMany', target: 'headmates', uiSchema: { title: 'headmates present' } },
      { name: 'location_type', type: 'string', uiSchema: { title: 'type', enum: [
        {label:'room',value:'room'},
        {label:'landscape',value:'landscape'},
        {label:'building',value:'building'},
        {label:'city',value:'city'},
        {label:'forest',value:'forest'},
        {label:'mountain',value:'mountain'},
        {label:'ocean',value:'ocean'},
        {label:'void',value:'void'},
        {label:'other',value:'other'},
      ]}},
      { name: 'atmosphere', type: 'string', uiSchema: { title: 'atmosphere' } },
      { name: 'lighting', type: 'string', uiSchema: { title: 'lighting' } },
      { name: 'soundscape', type: 'string', uiSchema: { title: 'soundscape' } },
      { name: 'sensory_details', type: 'text', uiSchema: { title: 'sensory details', type: 'textarea' } },
      { name: 'created_at', type: 'datetime', uiSchema: { title: 'created' } },
      { name: 'updated_at', type: 'datetime', uiSchema: { title: 'updated' } },
    ]
  },

  system_events: {
    name: 'system_events',
    title: 'system events',
    fields: [
      { name: 'event_type', type: 'string', uiSchema: { title: 'type', enum: [
        {label:'front change',value:'front_change'},
        {label:'new headmate',value:'new_headmate'},
        {label:'headmate update',value:'headmate_update'},
        {label:'connection change',value:'connection_change'},
        {label:'note added',value:'note_added'},
        {label:'note updated',value:'note_updated'},
        {label:'scene created',value:'scene_created'},
        {label:'scene updated',value:'scene_updated'},
        {label:'image generated',value:'image_generated'},
        {label:'mood change',value:'mood_change'},
        {label:'switch',value:'switch'},
        {label:'co-conscious',value:'co_conscious'},
        {label:'other',value:'other'},
      ]}},
      { name: 'description', type: 'text', uiSchema: { title: 'description', type: 'textarea' } },
      { name: 'headmates', type: 'json', uiSchema: { title: 'related headmates' } },
      { name: 'data', type: 'json', uiSchema: { title: 'event data' } },
      { name: 'timestamp', type: 'datetime', uiSchema: { title: 'timestamp', required: true } },
      { name: 'source', type: 'string', uiSchema: { title: 'source' } },
      { name: 'created_at', type: 'datetime', uiSchema: { title: 'created' } },
    ]
  },

  headmate_images: {
    name: 'headmate_images',
    title: 'headmate images',
    fields: [
      { name: 'headmate', type: 'belongsTo', target: 'headmates', uiSchema: { title: 'headmate' } },
      { name: 'image_url', type: 'string', uiSchema: { title: 'image url', required: true } },
      { name: 'prompt', type: 'text', uiSchema: { title: 'generation prompt' } },
      { name: 'image_type', type: 'string', uiSchema: { title: 'type', enum: [
        {label:'portrait',value:'portrait'},
        {label:'full body',value:'full_body'},
        {label:'casual',value:'casual'},
        {label:'expression',value:'expression'},
        {label:'scene',value:'scene'},
        {label:'concept art',value:'concept_art'},
      ]}},
      { name: 'is_favorite', type: 'boolean', uiSchema: { title: 'favorite' } },
      { name: 'is_active', type: 'boolean', uiSchema: { title: 'active' } },
      { name: 'generation_params', type: 'json', uiSchema: { title: 'generation params' } },
      { name: 'created_at', type: 'datetime', uiSchema: { title: 'created' } },
    ]
  },
};

export default SYSTEM_TRACKER_COLLECTIONS;
