import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { OpLogEntry } from '../features/edgeless/storage/oplog';

const DB_NAME = 'pkm-local-db';
const DB_VERSION = 2; // Incremented for new store

// Define the structure of our database using the DBSchema interface
interface PkmDbSchema extends DBSchema {
  // 'collections' is an object store (like a table).
  // 'key' is the type of the primary key (in this case, the collection name).
  // 'value' is the type of the data stored.
  collections: {
    key: string;
    value: any; // We'll store the NocoBase collection objects here
  };
  oplog: {
    key: string; // id
    value: OpLogEntry;
    indexes: {
      'by-drawing': string;
      'by-synced': number; // 0 for false, 1 for true to ensure IDB compatibility across all browsers
    };
  };
}

class LocalDbService {
  private dbPromise: Promise<IDBPDatabase<PkmDbSchema>>;

  constructor() {
    this.dbPromise = openDB<PkmDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // This function runs if the database doesn't exist or the version has changed.
        // We create our object stores here.
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('oplog')) {
          const oplogStore = db.createObjectStore('oplog', { keyPath: 'id' });
          oplogStore.createIndex('by-drawing', 'drawingId');
          // For 'by-synced', index on a synthetic property if needed, but since we can't easily add synthetic, 
          // let's index on 'synced' assuming modern IDB supports boolean, 
          // or we can handle it via a boolean index since most modern browsers do support it.
          oplogStore.createIndex('by-synced', 'synced');
        }
      },
    });
  }

  // --- Collection Methods ---

  public async saveCollections(collections: any[]): Promise<void> {
    const db = await this.dbPromise;
    const CHUNK_SIZE = 200;

    let savedCount = 0;
    for (let i = 0; i < collections.length; i += CHUNK_SIZE) {
      const chunk = collections.slice(i, i + CHUNK_SIZE);
      const tx = db.transaction('collections', 'readwrite');
      await Promise.all(chunk.map(collection => tx.store.put(collection)));
      await tx.done;
      savedCount += chunk.length;

      // Yield to the event loop between chunks to prevent UI lockup
      if (i + CHUNK_SIZE < collections.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log(`Saved ${savedCount} collections to local DB in batches of ${CHUNK_SIZE}.`);
  }

  /**
   * Retrieves all collections stored in the local database.
   * @returns A promise that resolves to an array of collection objects.
   */
  public async getAllCollections(): Promise<any[]> {
    const db = await this.dbPromise;
    return db.getAll('collections');
  }

  // --- Oplog Methods ---

  public async saveOplogBatch(entries: OpLogEntry[]): Promise<void> {
    const db = await this.dbPromise;
    const CHUNK_SIZE = 200;

    let savedCount = 0;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const tx = db.transaction('oplog', 'readwrite');
      await Promise.all(chunk.map(entry => tx.store.put(entry)));
      await tx.done;
      savedCount += chunk.length;

      // Yield to the event loop between chunks to prevent UI lockup
      if (i + CHUNK_SIZE < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log(`Saved ${savedCount} oplog entries to local DB in batches of ${CHUNK_SIZE}.`);
  }

  public async getUnsyncedOplog(drawingId?: string): Promise<OpLogEntry[]> {
    const db = await this.dbPromise;

    // Using the 'by-synced' index to quickly find unsynced items.
    // If the index expects a boolean:
    const unsyncedCursor = await db.getAllFromIndex('oplog', 'by-synced', IDBKeyRange.only(false));

    if (drawingId) {
      return unsyncedCursor.filter(entry => entry.drawingId === drawingId);
    }

    return unsyncedCursor;
  }
}

// Export a singleton instance of the service
export const localDbService = new LocalDbService();