import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/data.service';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import type { FieldInstance } from '@/services/schema.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const TableManager: React.FC = () => {
  // Subscribe to the collections from the central Zustand store
  const collections = useCollectionsStore((state) => state.collections);
  const [newTableName, setNewTableName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // When the component mounts, trigger a sync to load cached data and fetch fresh data.
  useEffect(() => {
    dataService.syncTables();
  }, []);

  const handleCreateTable = async () => {
    if (newTableName.trim() === '') {
      toast.error('table name cannot be empty.');
      return;
    }

    setIsCreating(true);
    try {
      // For simplicity, new tables will have a single 'name' field by default.
      const defaultFields: FieldInstance[] = [{ name: 'name', type: 'text' }];
      await dataService.createTable(newTableName, defaultFields);
      setNewTableName('');
      // No need to manually refresh; createTable now triggers a sync automatically.
      toast.success(`collection '${newTableName}' created successfully`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`failed to create table: ${error.message}`);
      } else {
        toast.error('an unknown error occurred.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const parseI18nTemplate = (str: string): string => {
    const match = str.match(/^\{\{\s*t\(['"](.+)['"]\)\s*\}\}$/);
    if (match) {
      return match[1].replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Collection</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Enter new collection name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
            disabled={isCreating}
          />
          <Button onClick={handleCreateTable} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {collections.map(collection => (
                <li key={collection.name}>{parseI18nTemplate(collection.title || collection.name)}</li>
              ))}
            </ul>
          ) : (
            <p>No collections found. They may be loading...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
