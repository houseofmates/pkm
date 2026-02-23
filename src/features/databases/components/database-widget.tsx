import { useState, useEffect } from 'react';
import type { Collection } from '@/types/nocobase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, RotateCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRecords } from '@/hooks/use-records';
import { cn } from '@/lib/utils';
import { VIEW_REGISTRY } from '@/components/views/registry';
import type { ViewType } from '@/components/views/registry';
import { DatabaseSettingsForm } from './database-settings-form';

interface DatabaseWidgetProps {
  collection: Collection;
  onRemove: () => void;
  className?: string;
  initialView: ViewType;
  viewConfig?: {
    sort?: string[];
    filter?: Record<string, any>;
    viewType?: ViewType;
  };
  onConfigChange?: (newConfig: any) => void;
  onHeaderMouseDown?: (e: React.MouseEvent) => void;
}

export function DatabaseWidget({ collection, onRemove, className, initialView, viewConfig = {}, onConfigChange, onHeaderMouseDown }: DatabaseWidgetProps) {
  // merge initial view with config view type
  const currentView = viewConfig.viewType || initialView;

  const { records, loading, refresh, createRecord, updateRecord } = useRecords(collection.name, {
    sort: viewConfig.sort,
    filter: viewConfig.filter
  });

  // sync config changes to userecords
  useEffect(() => {
    refresh({ sort: viewConfig.sort, filter: viewConfig.filter });
  }, [viewConfig.sort, JSON.stringify(viewConfig.filter)]);

  const CurrentViewComponent = VIEW_REGISTRY[currentView] || VIEW_REGISTRY['table'];

  // helper to update config
  const updateConfig = (key: string, value: any) => {
    if (onConfigChange) {
      onConfigChange({ ...viewConfig, [key]: value });
    }
  };

  return (
    <Card className={cn("w-[600px] h-[400px] flex flex-col shadow-lg isolate bg-card", "card-fix", className)}>
      <CardHeader
        className="p-3 border-b border-primary flex flex-row items-center justify-between space-y-0 bg-muted/20 handle cursor-move rounded-t-[inherit]"
        onMouseDown={onHeaderMouseDown}
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-bold lowercase flex items-center gap-2">
            {collection.title || collection.name}
            <span className="text-muted-foreground opacity-50 font-normal">/ {currentView}</span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="view settings">
                <SettingsIcon className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <DatabaseSettingsForm
                collectionName={collection.name}
                title={collection.title || collection.name}
                viewConfig={viewConfig}
                fields={collection.fields}
                onUpdateConfig={(k, v) => updateConfig(k, v)}
                onDelete={onRemove}
                onUpdateMetadata={() => {
                  // trigger refresh or ui update if needed, typically auto-handled by useappsetting binding
                  // but we might want to force re-render title
                }}
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refresh()} title="refresh data">
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden relative bg-background rounded-b-[inherit]">
        <CurrentViewComponent
          data={records}
          collection={collection}
          loading={loading}
          config={viewConfig}
          onConfigChange={(newConf: any) => onConfigChange?.({ ...viewConfig, ...newConf })}
          onCreate={createRecord}
          onUpdateRecord={updateRecord}
        />
      </CardContent>
    </Card>
  );
}
