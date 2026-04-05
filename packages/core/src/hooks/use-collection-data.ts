import { useState, useEffect, useCallback, useRef } from 'react';
import type { Record as SchemaRecord, TableDefinition, FieldDefinition } from '@/schema/types';
import { useCollections } from '@/hooks/use-collections';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';
import { extractRecords } from '@/lib/nocobase-utils';
import { generateAndSaveAiField } from '@/services/ai-field-generator';

/**
 * encapsulates the data loading / mutation logic previously found
 * in collectiondetailpage.  the hook is intentionally fairly
 * "dumb"; it takes an api client and the collection name as
 * arguments and returns state and callbacks.  calling components
 * deal only with rendering.
 */

// minimal shape of the api client used by the hook
interface CollectionClient {
  getCollection(name: string): Promise<any>;
  listRecords(name: string, opts?: any): Promise<any>;
  createRecord(name: string, data: any): Promise<any>;
  updateRecord(name: string, id: any, data: any): Promise<any>;
  deleteRecord(name: string, id: any): Promise<any>;
  deleteRecordByFilter(name: string, filter: Record<string, unknown>): Promise<any>;
  listFields(name: string): Promise<any>;
  createField(name: string, data: any): Promise<any>;
}

export function useCollectionData(
  client: CollectionClient,
  collectionName: string,
  activeFronters: string[] | null = null
) {
  const [collection, setCollection] = useState<TableDefinition | null>(null);
  const [records, setRecords] = useState<SchemaRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [, setDeletedStack] = useState<SchemaRecord[]>([]);
  const fetchCounterRef = useRef(0);

  // we reuse availablecollections from usecollections so that fetchdata
  // can try a preloaded copy before hitting the api
  const { collections: availableCollections, loading: collectionsLoading } = useCollections();
  const availableCollectionsRef = useRef(availableCollections);
  availableCollectionsRef.current = availableCollections;

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchCounterRef.current;
    setLoading(true);
    setFetchError(null);
    try {
      let colData: TableDefinition | null = null;
      const currentCollections = availableCollectionsRef.current;
      const preloaded = currentCollections.find(
        (c: TableDefinition) =>
          (c.name || '').toLowerCase() === (collectionName || '').toLowerCase()
      );

      if (preloaded) {
        secureLogger.info('found preloaded collection:', preloaded.name);
        colData = preloaded;
      }

      if (!colData?.fields) {
        try {
          secureLogger.info('attempting to fetch full collection schema with fields...');
          const colRes = await client.getCollection(collectionName);
          if (fetchId !== fetchCounterRef.current) return;

          if (colRes?.data && typeof colRes.data === 'object') {
            colData = colRes.data;
          } else if (preloaded) {
            colData = preloaded;
          }
        } catch (e) {
          if (fetchId !== fetchCounterRef.current) return;
          secureLogger.warn('failed to fetch collection schema, using preloaded if available', e);
          if (preloaded) colData = preloaded;
        }
      }

      if (colData && fetchId === fetchCounterRef.current) {
        setCollection(colData);
        // check for fronter field and auto-create if missing for pkm consistency
        let hasFronter = colData.fields?.some((f: FieldDefinition) => f.name === 'fronter');

        if (!hasFronter) {
          try {
            const fieldsRes = await client.listFields(collectionName);
            if (fetchId !== fetchCounterRef.current) return;
            const fields = fieldsRes?.data || [];
            if (fields.length > 0) {
              colData.fields = fields;
              hasFronter = fields.some((f: FieldDefinition) => f.name === 'fronter');
            }
          } catch (e) {
            secureLogger.warn("failed to fetch fields separately when checking for fronter:", e);
          }
        }

        if (!hasFronter && fetchId === fetchCounterRef.current) {
          try {
            secureLogger.info('auto-creating "fronter" field for', collectionName);
            await client.createField(collectionName, {
              name: 'fronter',
              type: 'string',
              interface: 'input',
            });
            if (!colData.fields) colData.fields = [];
            colData.fields.push({ id: 'fronter', name: 'fronter', type: 'string', label: 'fronter' });
          } catch (e: any) {
             secureLogger.warn('failed to auto-create fronter field', e);
          }
        }
      }

      const recRes = await client.listRecords(collectionName);
      if (fetchId !== fetchCounterRef.current) return;
      const recData = extractRecords(recRes);
      setRecords(recData);
    } catch (error: any) {
      if (fetchId !== fetchCounterRef.current) return;
      secureLogger.error(error instanceof Error ? error.message : String(error));
      setFetchError(error?.message || 'unknown error');
      toast.error('failed to load collection data');
    } finally {
      if (fetchId === fetchCounterRef.current) {
        setLoading(false);
      }
    }
  }, [client, collectionName]);

  const handleDirectCreate = useCallback(
    async (initialData: Partial<SchemaRecord> = {}) => {
      try {
        const dataToSubmit: Partial<SchemaRecord> = { ...initialData };
        if (activeFronters && activeFronters.length > 0) {
          const hasFronter = collection?.fields?.some(
            (f: FieldDefinition) => f.name === 'fronter'
          );
          if (hasFronter) {
            dataToSubmit['fronter'] = activeFronters[0];
          }
        }

        await client.createRecord(collectionName, dataToSubmit);
        toast.success('record created');
        fetchData();
      } catch (error) {
        secureLogger.error(error instanceof Error ? error.message : String(error));
        toast.error('failed to create record');
      }
    },
    [activeFronters, client, collection, collectionName, fetchData]
  );

  const handleUpdateRecord = useCallback(
    async (id: string | number, data: Partial<SchemaRecord>) => {
      try {
        setRecords(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
        await client.updateRecord(collectionName, id, data);
      } catch (error) {
        secureLogger.error('failed to update record', error);
        toast.error('failed to update record');
        fetchData();
      }
    },
    [client, collectionName, fetchData]
  );

  const handleUndoDelete = useCallback(async () => {
    let lastDeleted: SchemaRecord | undefined;
    setDeletedStack(prev => {
      lastDeleted = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (!lastDeleted) return;

    try {
      const rest: Partial<SchemaRecord> = { ...lastDeleted };
      delete rest.id;
      delete (rest as any).created_at;
      delete (rest as any).updated_at;
      await client.createRecord(collectionName, rest);
      toast.success('deletion undone');
      fetchData();
    } catch (e) {
      secureLogger.error('failed to undo delete', e);
      toast.error('failed to undo delete');
    }
  }, [client, collectionName, fetchData]);

  const handleDeleteRecord = useCallback(
    async (record: SchemaRecord) => {
      if (!record || record.id === undefined || record.id === null) {
        if (record && (record as any).timestamp) {
          try {
            await client.deleteRecordByFilter(collectionName, { timestamp: (record as any).timestamp });
            setDeletedStack(prev => [...prev, record]);
            toast.success('record deleted');
            setRecords(prev => prev.filter(r => (r as any).timestamp !== (record as any).timestamp));
            return;
          } catch (error) {
            secureLogger.error('failed to delete record by timestamp', error);
            toast.error('failed to delete record');
            return;
          }
        }
        toast.error('cannot delete record: missing id');
        return;
      }

      try {
        await client.deleteRecord(collectionName, record.id);
        setDeletedStack(prev => [...prev, record]);
        toast.success('record deleted');
        setRecords(prev => prev.filter(r => r.id !== record.id));
      } catch (error) {
        secureLogger.error('failed to delete record', error);
        toast.error('failed to delete record');
      }
    },
    [client, collectionName]
  );

  const restoreRecord = useCallback(
    async (recordToRestore: SchemaRecord) => {
      try {
        const rest: Partial<SchemaRecord> = { ...recordToRestore };
        delete rest.id;
        delete (rest as any).created_at;
        delete (rest as any).updated_at;
        await client.createRecord(collectionName, rest);
        toast.success('deletion undone');
        fetchData();
        setDeletedStack(prev => prev.filter(r => r.id !== recordToRestore.id));
      } catch (e) {
        secureLogger.error('failed to undo delete', e);
        toast.error('failed to undo delete');
      }
    },
    [client, collectionName, fetchData]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        setDeletedStack(currentStack => {
          if (currentStack.length > 0) {
            const last = currentStack[currentStack.length - 1];
            restoreRecord(last);
            return currentStack.slice(0, -1);
          }
          return currentStack;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restoreRecord]);

  useEffect(() => {
    const handleCreate = async (evt: Event) => {
      const e = evt as CustomEvent<any>;
      if (e.detail?.collection === collectionName) {
        try {
          const createRes = await client.createRecord(collectionName, e.detail.data);
          const newId = createRes?.id || createRes?.data?.id;
          toast.success('record created!');
          fetchData();
          if (newId && collection?.fields?.some((f: FieldDefinition) => f.name === 'ai')) {
             generateAndSaveAiField(collectionName, newId, 'ai', {
              instruction: 'provide a brief summary and initial ideas for this new entry',
              topK: 5
            }).catch(err => secureLogger.warn('auto-suggest generation failed', err));
          }
        } catch (err) {
          secureLogger.error(String(err));
          toast.error('failed to create record');
        }
      }
    };
    window.addEventListener('pkm:create-record', handleCreate);
    return () => window.removeEventListener('pkm:create-record', handleCreate);
  }, [collectionName, client, collection, fetchData]);

  useEffect(() => {
    if (!collectionsLoading) {
      fetchData();
    }
  }, [fetchData, collectionsLoading]);

  return {
    collection,
    records,
    loading,
    fetchError,
    handleDirectCreate,
    handleUpdateRecord,
    handleDeleteRecord,
    handleUndoDelete,
    restoreRecord,
    fetchData,
    setCollection,
    setRecords
  };
}
