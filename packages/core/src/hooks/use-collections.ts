
import { useAuth } from '@/contexts/auth-context';
import type { Collection } from '@/types/nocobase';
import { useQuery } from '@tanstack/react-query';
import { secureLogger } from '@/lib/secure-logger';

export type { Collection };

const SYSTEM_COLLECTIONS_SET = new Set([
  'server-stats', 'pkm_backend', 'pkm_canvases', 'pkm_settings',
  'form-submissions', 'public_blocks', 'public_pages', 'site-pages',
  'website', 'front_history', 'sidebar_item_colors',
  'dupemates-stats', 'dupemates-pages', 'dupe-forms', 'llms',
  'users', 'roles', 'attachments', 'collection_fields', 'collections',
  'ui_schemas', 'application_installations', 'cas_providers', 'oidc_providers', 'saml_providers',
  'form_submissions', 'site_pages',
]);

// Discover additional collections from localStorage cache
function discoverCollectionsFromCache(): Array<{name: string, title: string}> {
  const discovered: Array<{name: string, title: string}> = [];
  try {
    // Check sidebar items for collection references
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
    
    // Check database order setting
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
      });
    }
    
    // Check database order setting
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
              await client.updateCollection(col.name, { hidden: true, title: col.title || 'PKM Settings' });
            }
          } catch (e) {
            secureLogger.error('Failed to hide pkm_settings:', e);
          }
        }
      });

      return rawCollections;
    } catch (err: unknown) {
      secureLogger.error("fetchCollections Error object:", err);
      const msg = (err instanceof Error ? err.message : JSON.stringify(err) || '').toString();

      if (msg.includes('404') || msg.includes('401')) {
        secureLogger.warn("Auth Error Detected: Logging out.");
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
      const filtered = data.filter((col: Collection) => {
        const name = (col.name || '').toLowerCase().trim();
        const title = (col.title || '').toLowerCase().trim();

        if (SYSTEM_COLLECTIONS.includes(name)) return false;
        if (name === 'pkm_settings' || title === 'pkm settings' || name === 'front_history' || title === 'front history') return false;
        if (name.includes('backend') || title.includes('backend')) return false;
        if (col.hidden) return false;
        return true;
      });

      // Merge with hardcoded collections that may be missing from API response
      const existingNames = new Set(filtered.map((c: Collection) => c.name.toLowerCase()));
      const cachedCollections = discoverCollectionsFromCache();
      const allExtraCollections = [...HARDCODED_COLLECTIONS, ...cachedCollections];
      
      const missingCollections = allExtraCollections
        .filter(hc => !existingNames.has(hc.name.toLowerCase()))
        .map(hc => ({ ...hc, fields: [] } as Collection));

      return [...filtered, ...missingCollections];
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

  // If collection has no fields, fetch full details
  const shouldFetchDetails = !!collectionFromList && (!collectionFromList.fields || collectionFromList.fields.length === 0);

  const { data: fullCollection, isLoading: detailsLoading } = useQuery({
    queryKey: ['collection', name],
    queryFn: async () => {
      if (!isAuthenticated || !client) return null;
      try {
        const response = await client.getCollection(name);
        return response?.data || null;
      } catch (e) {
        secureLogger.warn('Failed to fetch collection details:', e);
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
