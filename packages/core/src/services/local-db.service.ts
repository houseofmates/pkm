import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'pkm-local-db';
const DB_VERSION = 1;

// Define the structure of our database using the DBSchema interface
interface PkmDbSchema extends DBSchema {
  // 'collections' is an object store (like a table).
  // 'key' is the type of the primary key (in this case, the collection name).
  // 'value' is the type of the data stored.
  collections: {
    key: string;
    value: any; // We'll store the NocoBase collection objects here
  };
  // We can add more object stores for records, settings, etc., in the future.
}

class LocalDbService {
  private dbPromise: Promise<IDBPDatabase<PkmDbSchema>>;

  constructor() {
    this.dbPromise = openDB<PkmDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // This function runs if the database doesn't exist or the version has changed.
        // We create our object stores here.
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'name' });
        }
      },
    });
  }

  // --- Collection Methods ---

  /**
   * Saves an array of NocoBase collections to the local database.
   * This will overwrite any existing collections with the same name.
   * @param collections The array of collection objects to save.
   */
  public async saveCollections(collections: any[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('collections', 'readwrite');
    await Promise.all(collections.map(collection => tx.store.put(collection)));
    await tx.done;
    secureLogger.info(`Saved ${collections.length} collections to local DB.`);
  }

  /**
   * Retrieves all collections stored in the local database.
   * @returns A promise that resolves to an array of collection objects.
   */
  public async getAllCollections(): Promise<any[]> {
    const db = await this.dbPromise;
    return db.getAll('collections');
  }
}

// Export a singleton instance of the service
export const localDbService = new LocalDbService();