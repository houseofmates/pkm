import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { secureLogger } from '@/lib/secure-logger';

export type { Collection };

// the single source of truth for all 15 user collections.
// these are merged with api results so collections show up even if the api doesn't list them.
export const HARDCODED_COLLECTIONS = [
  'activities', 'activity_logs', 'bookmarks', 'captures', 'drawings',
  'events', 'exercise', 'finances', 'habits', 'headmates',
  'hygiene-log', 'journal', 'media', 'products', 'sleep'
];

const SYSTEM_COLLECTIONS_SET = new Set([
  'server-stats', 'pkm_backend', 'pkm_canvases', 'pkm_settings',
  'form-submissions', 'public_blocks', 'public_pages', 'site-pages',
  'website', 'front_history', 'sidebar_item_colors',
  'dupemates-stats', 'dupemates-pages', 'dupe-forms', 'llms',
  'users', 'roles', 'attachments', 'collection_fields', 'collections',
  'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers',
  'form_submissions', 'site_pages',
]);

// discover additional collections from localstorage cache
function discoverCollectionsFromCache(): Array<{ name: string, title: string }> {
  const discovered: Array<{ name: string, title: string }> = [];
  try {
    // check sidebar items for collection references
    const sidebarItems = localStorage.getItem('sidebar_items');
    if (sidebarItems) {
      const items = JSON.parse(sidebarItems);
      items.forEach((item: any) => {
        if (item.type === 'collection' && item.id &&
          !item.id.startsWith('doc_') &&
          !item.id.startsWith('drawing_') &&
          !item.id.startsWith('folder_') &&
          !SYSTEM_COLLECTIONS_SET.has(item.id.toLowerCase())) {
          discovered.push({ name: item.id, title: item.name || item.id });
        }
      });
    }

    // check database order setting
    const dbOrder = localStorage.getItem('database_order');
    if (dbOrder) {
      const order = JSON.parse(dbOrder);
      order.forEach((name: string) => {
        if (!discovered.some(d => d.name === name) &&
          !SYSTEM_COLLECTIONS_SET.has(name.toLowerCase())) {
          discovered.push({ name, title: name });
        }
      });
    }
  } catch (e) {
    // ignore cache errors
  }
  return discovered;
}

export function useCollections() {
  const { client, isAuthenticated, logout } = useAuth();

  const fetchCollections = async () => {
    if (!isAuthenticated) return [];

    try {
      // request collections with their fields so widgets and forms can render correctly
      const response = await client.listCollections({ appends: ['fields'] });
      const rawCollections = Array.isArray(response.data) ? response.data : (response?.data as any)?.data || [];

      // side effects (hiding check)
      rawCollections.forEach(async (col: Collection) => {
        const nameNorm = (col.name || '').toLowerCase().trim();
        if (nameNorm === 'pkm_settings' && !col.hidden) {
          try {
            if (client?.updateCollection) {
              await client.updateCollection(col.name, { hidden: true, title: col.title || 'pkm settings' });
            }
          } catch (e) {
            secureLogger.error('failed to hide pkm_settings:', e);
          }
        }
      });

      return rawCollections;
    } catch (err: unknown) {
      secureLogger.error("fetchcollections error object:", err);
      const msg = (err instanceof Error ? err.message : JSON.stringify(err) || '').toString();

      if (msg.includes('404') || msg.includes('401')) {
        secureLogger.warn("auth error detected: logging out.");
        logout();
      }
      throw new Error(msg || 'failed to fetch collections');
    }
  };

  const { data: collections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    enabled: isAuthenticated,
    select: (data) => {
      const filtered = data.filter((col: Collection) => {
        const name = (col.name || '').toLowerCase().trim();

        if (SYSTEM_COLLECTIONS_SET.has(name)) return false;
        if (col.hidden) return false;
        return true;
      });

      // merge with hardcoded collections that may be missing from api response
      const existingNames = new Set(filtered.map((c: Collection) => c.name.toLowerCase()));
      const cachedCollections = discoverCollectionsFromCache();

      // normalize names for dedup (handles hygiene-log vs hygiene_log etc.)
      const normalizedExisting = new Set(filtered.map((c: Collection) => (c.name || '').toLowerCase().replace(/[-_]/g, '')));

      // first add hardcoded collections that are missing from api
      const hardcodedMissing = HARDCODED_COLLECTIONS
        .filter(name => !normalizedExisting.has(name.toLowerCase().replace(/[-_]/g, '')))
        .map(name => ({ name, title: name, fields: [] } as Collection));

      // then add any additional collections discovered from cache
      const cacheMissing = cachedCollections
        .filter(hc => !existingNames.has(hc.name.toLowerCase()) && !HARDCODED_COLLECTIONS.includes(hc.name.toLowerCase()))
        .map(hc => ({ ...hc, fields: [] } as Collection));

      return [...filtered, ...hardcodedMissing, ...cacheMissing];
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
  const { client, isAuthenticated } = useAuth();
  const { collections, loading: collectionsLoading, error: collectionsError } = useCollections();
  const collectionFromList = collections.find((c: Collection) => c.name === name);

  // if collection has no fields, fetch full details
  const shouldFetchDetails = !!collectionFromList && (!collectionFromList.fields || collectionFromList.fields.length === 0);

  const { data: fullCollection, isLoading: detailsLoading } = useQuery({
    queryKey: ['collection', name],
    queryFn: async () => {
      if (!isAuthenticated || !client) return null;
      try {
        const response = await client.getCollection(name);
        return response?.data || null;
      } catch (e) {
        secureLogger.warn('failed to fetch collection details:', e);
        return null;
      }
    },
    enabled: isAuthenticated && shouldFetchDetails,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const collection = fullCollection || collectionFromList;
  const loading = collectionsLoading || (shouldFetchDetails && detailsLoading);

  return { data: collection, loading, error: collectionsError };
}
