/* eslint-disable */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { db } from '../../db/database';
import type { SystemExport, ImportValidation } from '../../types/schema';

export function ImportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportFilter, setExportFilter] = useState({
    dateRange: 'all' as 'all' | 'custom',
    startDate: '',
    endDate: '',
    memberIds: [] as string[],
    includePrivate: true
  });
  const [importValidation, setImportValidation] = useState<ImportValidation | null>(null);
  const [exportUrl, setExportUrl] = useState<string>('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await db.exportAll();
      
      // Apply filters if needed
      let filteredData = { ...data };
      
      if (exportFilter.dateRange === 'custom' && exportFilter.startDate && exportFilter.endDate) {
        const start = new Date(exportFilter.startDate);
        const end = new Date(exportFilter.endDate);
        
        filteredData.frontSessions = data.frontSessions.filter(session => {
          const sessionDate = new Date(session.startedAt);
          return sessionDate >= start && sessionDate <= end;
        });
        
        filteredData.journalEntries = data.journalEntries.filter(entry => {
          const entryDate = new Date(entry.createdAt);
          return entryDate >= start && entryDate <= end;
        });
        
        filteredData.chatMessages = data.chatMessages.filter(msg => {
          const msgDate = new Date(msg.createdAt);
          return msgDate >= start && msgDate <= end;
        });
      }
      
      if (exportFilter.memberIds.length > 0) {
        filteredData.members = data.members.filter(member => 
          exportFilter.memberIds.includes(member.id)
        );
        
        const memberIdsSet = new Set(exportFilter.memberIds);
        filteredData.frontSessions = filteredData.frontSessions.map(session => ({
          ...session,
          entries: session.entries.filter(entry => memberIdsSet.has(entry.memberId))
        })).filter(session => session.entries.length > 0);
        
        filteredData.journalEntries = filteredData.journalEntries.filter(entry => 
          !entry.memberId || memberIdsSet.has(entry.memberId)
        );
        
        filteredData.chatMessages = filteredData.chatMessages.filter(msg => 
          memberIdsSet.has(msg.memberId)
        );
      }
      
      const exportData: SystemExport = {
        version: data.version,
        exportedAt: new Date().toISOString(),
        ...filteredData
      };

      if (exportFormat === 'json') {
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'csv') {
        // CSV export - create separate CSV files for each data type
        const csvFiles = [
          { name: 'members.csv', data: exportMembersToCSV(exportData.members) },
          { name: 'front-sessions.csv', data: exportFrontSessionsToCSV(exportData.frontSessions) },
          { name: 'journal-entries.csv', data: exportJournalEntriesToCSV(exportData.journalEntries) },
          { name: 'chat-messages.csv', data: exportChatMessagesToCSV(exportData.chatMessages) }
        ];
        
        for (const file of csvFiles) {
          if (file.data) {
            const blob = new Blob([file.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text) as SystemExport;
      
      // Validate the import data
      const validation = validateImportData(data);
      setImportValidation(validation);
      
      if (validation.valid) {
        await db.importAll({
          version: data.version,
          system: data.system,
          members: data.members || [],
          customFields: data.customFields || [],
          frontSessions: data.frontSessions || [],
          groups: data.groups || [],
          journalEntries: data.journalEntries || [],
          chatMessages: data.chatMessages || [],
          memberNotes: data.memberNotes || []
        });
        
        // Reload the page to refresh all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportValidation({
        valid: false,
        errors: ['failed to parse import file: ' + (error instanceof Error ? error.message : 'unknown error')],
        warnings: [],
        stats: { members: 0, frontSessions: 0, groups: 0, journalEntries: 0, chatMessages: 0 }
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validateImportData = (data: any): ImportValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!data.version) {
      errors.push('missing version information');
    }
    
    if (!data.system) {
      errors.push('missing system information');
    }
    
    if (!Array.isArray(data.members)) {
      errors.push('invalid members data');
    }
    
    if (!Array.isArray(data.frontSessions)) {
      errors.push('invalid front sessions data');
    }
    
    // Check for potential conflicts
    if (data.members && data.members.length > 0) {
      const duplicateNames = data.members
        .map(m => m.name)
        .filter((name, index, arr) => arr.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        warnings.push(`duplicate member names found: ${duplicateNames.join(', ')}`);
      }
    }
    
    const stats = {
      members: data.members?.length || 0,
      frontSessions: data.frontSessions?.length || 0,
      groups: data.groups?.length || 0,
      journalEntries: data.journalEntries?.length || 0,
      chatMessages: data.chatMessages?.length || 0
    };
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats
    };
  };

  const exportMembersToCSV = (members: any[]) => {
    if (members.length === 0) return '';
    
    const headers = ['id', 'name', 'displayName', 'pronouns', 'color', 'description', 'status', 'createdAt', 'updatedAt'];
    const rows = members.map(member => [
      member.id,
      member.name,
      member.displayName || '',
      member.pronouns || '',
      member.color || '',
      member.description || '',
      member.status,
      member.createdAt,
      member.updatedAt
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const exportFrontSessionsToCSV = (sessions: any[]) => {
    if (sessions.length === 0) return '';
    
    const headers = ['id', 'startedAt', 'endedAt', 'comment'];
    const rows = sessions.map(session => [
      session.id,
      session.startedAt,
      session.endedAt || '',
      session.comment || ''
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const exportJournalEntriesToCSV = (entries: any[]) => {
    if (entries.length === 0) return '';
    
    const headers = ['id', 'memberId', 'content', 'createdAt', 'updatedAt'];
    const rows = entries.map(entry => [
      entry.id,
      entry.memberId || '',
      entry.content.replace(/\n/g, '\\n'),
      entry.createdAt,
      entry.updatedAt
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const exportChatMessagesToCSV = (messages: any[]) => {
    if (messages.length === 0) return '';
    
    const headers = ['id', 'memberId', 'content', 'threadId', 'createdAt', 'editedAt'];
    const rows = messages.map(message => [
      message.id,
      message.memberId,
      message.content.replace(/\n/g, '\\n'),
      message.threadId || '',
      message.createdAt,
      message.editedAt || ''
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold lowercase">import & export</h2>
        <p className="text-muted-foreground">manage your system tracker data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              export data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>export format</Label>
              <Select value={exportFormat} onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">json (complete)</SelectItem>
                  <SelectItem value="csv">csv (data files)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>date range</Label>
              <Select 
                value={exportFilter.dateRange} 
                onValueChange={(value: 'all' | 'custom') => setExportFilter(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all time</SelectItem>
                  <SelectItem value="custom">custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportFilter.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>start date</Label>
                  <Input
                    type="date"
                    value={exportFilter.startDate}
                    onChange={(e) => setExportFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>end date</Label>
                  <Input
                    type="date"
                    value={exportFilter.endDate}
                    onChange={(e) => setExportFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>include private data</Label>
              <Select 
                value={exportFilter.includePrivate.toString()} 
                onValueChange={(value) => setExportFilter(prev => ({ ...prev, includePrivate: value === 'true' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">yes</SelectItem>
                  <SelectItem value="false">no</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? 'exporting...' : 'export data'}
            </Button>

            <div className="text-xs text-muted-foreground">
              <p>• json export includes all data and relationships</p>
              <p>• csv export creates separate files for each data type</p>
              <p>• exports are stored locally and never uploaded</p>
            </div>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              import data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="import-file">select file</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            {importFile && (
              <div className="space-y-2">
                <p className="text-sm">
                  selected: <span className="font-medium">{importFile.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  size: {(importFile.size / 1024).toFixed(1)} kb
                </p>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={!importFile || isImporting}
              className="w-full"
            >
              {isImporting ? 'importing...' : 'import data'}
            </Button>

            {importValidation && (
              <div className="space-y-3">
                {importValidation.valid ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      import validation passed
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      import validation failed
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm">
                  <p className="font-medium mb-2">import summary:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>members: {importValidation.stats.members}</div>
                    <div>front sessions: {importValidation.stats.frontSessions}</div>
                    <div>groups: {importValidation.stats.groups}</div>
                    <div>journal entries: {importValidation.stats.journalEntries}</div>
                    <div>chat messages: {importValidation.stats.chatMessages}</div>
                  </div>
                </div>

                {importValidation.errors.length > 0 && (
                  <div>
                    <p className="font-medium text-sm text-red-600 mb-1">errors:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      {importValidation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importValidation.warnings.length > 0 && (
                  <div>
                    <p className="font-medium text-sm text-yellow-600 mb-1">warnings:</p>
                    <ul className="text-xs text-yellow-600 space-y-1">
                      {importValidation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>• only json files from system tracker exports are supported</p>
              <p>• importing will merge with existing data</p>
              <p>• backup your current data before importing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            about your data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h4 className="font-medium">local storage</h4>
              <p className="text-sm text-muted-foreground">
                all data is stored locally in your browser using indexeddb
              </p>
            </div>
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h4 className="font-medium">no cloud sync</h4>
              <p className="text-sm text-muted-foreground">
                your data never leaves your device unless you export it
              </p>
            </div>
            <div className="text-center">
              <Filter className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h4 className="font-medium">privacy first</h4>
              <p className="text-sm text-muted-foreground">
                complete control over your system data and privacy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}