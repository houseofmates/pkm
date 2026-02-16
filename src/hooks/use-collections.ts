
import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/types/nocobase';
import { useQuery } from '@tanstack/react-query';

export type { Collection };

const SYSTEM_COLLECTIONS = [
  'users', 'roles', 'attachments', 'collection_fields', 'collections',
  'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers',
  'form-submissions', 'site-pages', 'dupemates-stats', 'dupemates-pages', 'dupe-forms', 'form_submissions', 'site_pages',
  'server-stats', 'public_blocks', 'public_pages', 'pkm_canvases', 'pkm_settings', 'front_history', 'headmates', 'website', 'dupemates-pages'
];

export function useCollections() {
  const { client, isAuthenticated, logout } = useAuth();

  const fetchCollections = async () => {
  if (!isAuthenticated) return [];

  try {
  const response = await client.listCollections();
  const rawCollections = Array.isArray(response.data) ? response.data : (response?.data as any)?.data || [];

  // Side Effects (Hiding Check)
  rawCollections.forEach(async (col: Collection) => {
 const nameNorm = (col.name || '').toLowerCase().trim();
 if (nameNorm === 'pkm_settings' && !col.hidden) {
 try {
 if (client?.updateCollection) {
   await client.updateCollection(col.name, { hidden: true, title: col.title || 'PKM Settings' });
 }
 } catch (e) {
 console.error('Failed to hide pkm_settings:', e);
 }
 }
  });

  return rawCollections;
  } catch (err: any) {
  console.error("fetchCollections Error object:", err);
  const msg = (err.message || JSON.stringify(err) || '').toString();

  if (msg.includes('404') || msg.includes('401')) {
 console.warn("Auth Error Detected: Logging out.");
 logout();
  }
  throw new Error(msg || 'Failed to fetch collections');
  }
  };

  const { data: collections = [], isLoading, error, refetch } = useQuery({
  queryKey: ['collections'],
  queryFn: fetchCollections,
  enabled: isAuthenticated,
  select: (data) => {
  return data.filter((col: Collection) => {
 const name = (col.name || '').toLowerCase().trim();
 const title = (col.title || '').toLowerCase().trim();

 if (SYSTEM_COLLECTIONS.includes(name)) return false;
 if (name === 'pkm_settings' || title === 'pkm settings' || name === 'front_history' || title === 'front history') return false;
 if (name.includes('backend') || title.includes('backend')) return false;
 if (col.hidden) return false;
 return true;
  });
  }
  });

  return {
  collections,
  loading: isLoading,
  error: error ? (error as Error).message : null,
  refresh: refetch
  };
}

export function useCollection(name: string) {
  const { collections, loading, error } = useCollections();
  const collection = collections.find((c: Collection) => c.name === name);
  return { data: collection, loading, error };
}
