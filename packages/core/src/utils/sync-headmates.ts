import { api } from '@/api/nocobase-client';
import { SimplyPluralClient } from '@/lib/simply-plural-client';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

export interface SimplyPluralMember {
  id: string;
  content: {
  name: string;
  pronouns?: string;
  avatarUrl?: string;
  color?: string;
  desc?: string;
  };
}

/**
 * syncs simplyplural headmates to the nocobase 'headmates' collection
 * creates/updates records to match simplyplural data
 */
export async function syncHeadmatesToNocoBase(apiKey: string): Promise<void> {
  try {
  // 1. fetch simplyplural members
  const meRes = await fetch(SimplyPluralClient.url('/me'), {
  headers: { 'Authorization': apiKey }
  });

  if (!meRes.ok) {
  throw new Error(`Failed to fetch SimplyPlural system: ${meRes.status}`);
  }

  const meData = await meRes.json();
  const systemId = meData.id;

  const membersRes = await fetch(SimplyPluralClient.url(`/members/${systemId}`), {
  headers: { 'Authorization': apiKey }
  });

  if (!membersRes.ok) {
  throw new Error(`Failed to fetch SimplyPlural members: ${membersRes.status}`);
  }

  const members: SimplyPluralMember[] = await membersRes.json();
  secureLogger.info(`Found ${members.length} SimplyPlural members to sync`);

  // 2. fetch existing nocobase headmates
  const existing = await api.listRecords('headmates', { pageSize: 500 });
  const existingMap = new Map();
  const existingArray = Array.isArray(existing) ? existing : (existing?.data as any[] || []);
  existingArray.forEach((h: any) => {
  if (h.simply_plural_id) {
 existingMap.set(h.simply_plural_id, h);
  }
  });

  secureLogger.info(`Found ${existingMap.size} existing headmates in NocoBase`);

  // 3. sync each member
  let created = 0;
  let updated = 0;

  for (const member of members) {
  // format color
  let color = member.content?.color;
  if (color && !color.startsWith('#')) {
 color = `#${color}`;
  }

  const headmateData = {
 simply_plural_id: member.id,
 name: member.content.name,
 pronouns: member.content.pronouns || '',
 avatar_url: member.content.avatarUrl || '',
 color: color || '#808080',
 description: member.content.desc || ''
  };

  const existing = existingMap.get(member.id);

  if (existing) {
 // update if data changed
 const needsUpdate =
 existing.name !== headmateData.name ||
 existing.color !== headmateData.color ||
 existing.pronouns !== headmateData.pronouns ||
 existing.avatar_url !== headmateData.avatar_url ||
 existing.description !== headmateData.description;

 if (needsUpdate) {
 await api.updateRecord('headmates', existing.id, headmateData);
 updated++;
 secureLogger.info(`Updated headmate: ${headmateData.name}`);
 }
 } else {
 // create new
 await api.createRecord('headmates', headmateData);
 created++;
 secureLogger.info(`Created headmate: ${headmateData.name}`);
 }

  }

  secureLogger.info(`Sync complete: ${created} created, ${updated} updated`);
  toast.success(`synced ${members.length} headmates (${created} new, ${updated} updated)`);

  } catch (error: any) {
  secureLogger.error('Failed to sync headmates:', error);
  toast.error('failed to sync headmates: ' + error.message);
  throw error;
  }
}
