import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/data.service';
import type { FieldInstance } from '@/services/schema.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TableInfo {
  name: string;
  fields: FieldInstance[];
}

export const TableManager: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [newTableName, setNewTableName] = useState('');

  // Function to fetch and update the list of tables
  const refreshTables = () => {
    const currentTables = dataService.getTables();
    setTables(currentTables);
  };

  // Fetch initial tables on component mount
  useEffect(() => {
    refreshTables();
  }, []);

  const handleCreateTable = () => {
    if (newTableName.trim() === '') {
      alert('Table name cannot be empty.');
      return;
    }

    try {
      // For simplicity, new tables will have a single 'name' field by default.
      const defaultFields: FieldInstance[] = [{ name: 'name', type: 'text' }];
      dataService.createTable(newTableName, defaultFields);
      setNewTableName('');
      refreshTables(); // Refresh the list after creation
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to create table: ${error.message}`);
      } else {
        alert('An unknown error occurred.');
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Table</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Enter new table name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
          />
          <Button onClick={handleCreateTable}>Create</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Tables</CardTitle>
        </CardHeader>
        <CardContent>
          {tables.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {tables.map(table => (
                <li key={table.name}>{table.name}</li>
              ))}
            </ul>
          ) : (
            <p>No tables created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};