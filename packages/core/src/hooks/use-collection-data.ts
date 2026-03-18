import { useState, useEffect, useCallback, useRef } from 'react';
import type { Record as SchemaRecord, TableDefinition, FieldDefinition } from '@/schema/types';
import { useCollections } from '@/hooks/use-collections';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';
import { extractRecords } from '@/lib/nocobase-utils';
import { generateAndSaveAiField } from '@/services/ai-field-generator';

/**
 * Encapsulates the data loading / mutation logic previously found
 * in CollectionDetailPage.  The hook is intentionally fairly
 * "dumb"; it takes an API client and the collection name as
 * arguments and returns state and callbacks.  Calling components
 * deal only with rendering.
 */

// minimal shape of the API client used by the hook
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

  // we reuse availableCollections from useCollections so that fetchData
  // can try a preloaded copy before hitting the API
  const { collections: availableCollections, loading: collectionsLoading } = useCollections();
  const availableCollectionsRef = useRef(availableCollections);
  availableCollectionsRef.current = availableCollections;

  const fetchData = useCallback(async () => {
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
        secureLogger.info('Found preloaded collection:', preloaded.name);
        colData = preloaded;
      }

      if (!colData?.fields) {
        try {
          secureLogger.info('Attempting to fetch full collection schema with fields...');
          const colRes = await client.getCollection(collectionName);
          secureLogger.info('getCollection response:', colRes);
          if (colRes?.data && typeof colRes.data === 'object') {
            colData = colRes.data;
          } else {
            secureLogger.warn('getCollection returned invalid data, using preloaded');
            if (preloaded) {
              colData = preloaded;
            }
          }
        } catch (e: unknown) {
          const msg =
            typeof e === 'object' && e !== null && 'message' in e
              ? (e as { message?: unknown }).message
              : String(e);
          secureLogger.warn('getCollection failed, using preloaded if available:', msg);
          if (preloaded) {
            secureLogger.info('Using preloaded collection without fields');
            colData = preloaded;
          } else {
            throw e;
          }
        }
      }

      if (!colData) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      if (!colData.fields || colData.fields.length === 0) {
        try {
          secureLogger.info('Collection lacks fields, fetching them separately...');
          const fields = await client.listFields(collectionName);
          secureLogger.info('Fetched fields:', fields);
          if (fields && fields.length > 0) {
            colData.fields = fields;
          }
        } catch (e) {
          secureLogger.warn('Failed to fetch fields separately:', e);
        }
      }

      setCollection(colData);

      // auto-create fronter field if missing
      if (colData) {
        let hasFronter =
          Array.isArray(colData.fields) &&
          colData.fields.some((f: FieldDefinition) => f.name === 'fronter');
        if (!hasFronter && (!colData.fields || colData.fields.length === 0)) {
          try {
            const fields = await client.listFields(collectionName);
            if (fields && fields.length > 0) {
              colData.fields = fields;
              hasFronter = fields.some((f: FieldDefinition) => f.name === 'fronter');
            }
          } catch (e) {
            secureLogger.warn(
              "Failed to fetch fields separately when checking for fronter:",
              e
            );
          }
        }

        if (!hasFronter) {
          try {
            secureLogger.info('Auto-creating \'fronter\' field for', collectionName);
            await client.createField(collectionName, {
              name: 'fronter',
              type: 'string',
              interface: 'input',
            });
            if (!colData.fields) colData.fields = [];
            colData.fields.push({
              id: 'fronter',
              name: 'fronter',
              type: 'string',
              label: 'fronter'
            });
          } catch (e: unknown) {
            const msg =
              typeof e === 'object' && e !== null &&
              'response' in e &&
              (e as any).response?.data?.errors?.[0]?.message
                ? (e as any).response.data.errors[0].message
                : String(e);
            if (msg.includes('already exists')) {
              secureLogger.info("'fronter' field already exists, skipping creation");
            } else {
              secureLogger.warn('Failed to auto-create fronter field', e);
            }
          }
        }
      }

      const recRes = await client.listRecords(collectionName);
      const recData = extractRecords(recRes);
      setRecords(recData);
    } catch (error: unknown) {
      secureLogger.error(
        error instanceof Error ? error.message : String(error)
      );
      setFetchError(
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as any).message
          : 'Unknown Error'
      );
      toast.error('failed to load collection data');
    } finally {
      setLoading(false);
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
        secureLogger.error(
          error instanceof Error ? error.message : String(error)
        );
        toast.error('failed to create record');
      }
    },
    [activeFronters, client, collection, collectionName, fetchData]
  );

  const handleUpdateRecord = useCallback(
    async (id: string | number, data: Partial<SchemaRecord>) => {
      try {
        setRecords(prev =>
          prev.map(r => (r.id === id ? { ...r, ...data } : r))
        );
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
      delete rest.created_at;
      delete rest.updated_at;
      await client.createRecord(collectionName, rest);
      toast.success('deletion undone');
      const res = await client.listRecords(collectionName, { pageSize: 100, sort: ['-created_at'] });
      setRecords(extractRecords(res));
    } catch (e) {
      secureLogger.error('failed to undo delete', e);
      toast.error('failed to undo delete');
    }
  }, [client, collectionName]);

  const handleDeleteRecord = useCallback(
    async (record: SchemaRecord) => {
      if (!record || record.id === undefined || record.id === null) {
        // fallback: try to delete by timestamp if id is missing
        if (record && record.timestamp) {
          secureLogger.info('id missing, attempting to delete by timestamp:', record.timestamp);
          try {
            await client.deleteRecordByFilter(collectionName, { timestamp: record.timestamp });
            setDeletedStack(prev => [...prev, record]);
            toast.success('record deleted (by timestamp)', {
              action: {
                label: 'undo',
                onClick: () => handleUndoDelete()
              }
            });
            // remove from local state using timestamp as fallback
            setRecords(prev => prev.filter(r => r.timestamp !== record.timestamp));
            return;
          } catch (error) {
            secureLogger.error('failed to delete record by timestamp', error);
            toast.error('failed to delete record');
            return;
          }
        }
        secureLogger.warn('attempted to delete record with missing id', record);
        toast.error('cannot delete record: missing id');
        return;
      }

      try {
        await client.deleteRecord(collectionName, record.id);
        setDeletedStack(prev => [...prev, record]);

        toast.success('record deleted', {
          action: {
            label: 'undo',
            onClick: () => handleUndoDelete()
          }
        });
        setRecords(prev => prev.filter(r => r.id !== record.id));
      } catch (error) {
        secureLogger.error('failed to delete record', error);
        toast.error('failed to delete record');
      }
    },
    [client, collectionName, handleUndoDelete]
  );

  const restoreRecord = useCallback(
    async (recordToRestore: SchemaRecord) => {
      try {
        const rest: Partial<SchemaRecord> = { ...recordToRestore };
        delete rest.id;
        delete rest.created_at;
        delete rest.updated_at;
        await client.createRecord(collectionName, rest);
        toast.success('deletion undone');
        const res = await client.listRecords(collectionName, { pageSize: 100, sort: ['-created_at'] });
        setRecords(extractRecords(res));
        setDeletedStack(prev => prev.filter(r => r.id !== recordToRestore.id));
      } catch (e) {
        secureLogger.error('failed to undo delete', e);
        toast.error('failed to undo delete');
      }
    },
    [client, collectionName]
  );

  // keyboard undo listener (ctrl/cmd+z)
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

  // listen for external create-record events
  useEffect(() => {
    const handleCreate = async (evt: Event) => {
      const e = evt as CustomEvent<Partial<SchemaRecord>>;
      if (e.detail?.collection === collectionName) {
        secureLogger.info('Creating record via event:', e.detail.data);
        try {
          const createRes = await client.createRecord(collectionName, e.detail.data);
          const newId = createRes?.id || (createRes?.data && createRes.data.id);
          toast.success('record created!');
          const res = await client.listRecords(collectionName, { pageSize: 100, sort: ['-created_at'] });
          setRecords(extractRecords(res));
          if (newId && collection?.fields?.some((f: FieldDefinition) => f.name === 'ai')) {
            generateAndSaveAiField(collectionName, newId, 'ai', {
              instruction: 'provide a brief summary and initial ideas for this new entry',
              topK: 5
            }).then(r => {
              if (!r.success) {
                secureLogger.warn('auto-suggest generation failed', r.error);
              }
            });
          }
        } catch (err) {
          secureLogger.error(String(err));
          toast.error('failed to create record');
        }
      }
    };
    window.addEventListener('pkm:create-record', handleCreate);
    return () => window.removeEventListener('pkm:create-record', handleCreate);
  }, [collectionName, client, collection]);

  // re-fetch when collections list finishes loading
  useEffect(() => {
    if (!collectionsLoading) {
      fetchData();
    }
  }, [fetchData, collectionsLoading]);

  // retry if collection still missing once availableCollections populates
  useEffect(() => {
    if (!collection && !loading && availableCollections.length > 0) {
      const found = availableCollections.find(
        (c: TableDefinition) => (c.name || '').toLowerCase() === (collectionName || '').toLowerCase()
      );
      if (found) {
        secureLogger.info('Late-rescue: Found collection in availableCollections:', found.name);
        setCollection(found);
        client.listRecords(collectionName).then(res => {
          setRecords(extractRecords(res));
        }).catch(e => secureLogger.error('Late-rescue record fetch failed', e));
      }
    }
  }, [collection, loading, availableCollections, collectionName, client]);

  // view config loader moved to component

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
