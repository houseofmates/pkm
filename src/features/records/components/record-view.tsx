import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SmartField } from '@/components/fields/smart-field';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreHorizontal, AlertCircle, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BacklinksFooter } from '@/components/BacklinksFooter';
import { LayoutRenderer } from '@/components/layout-renderer';
import { toast } from 'sonner';

interface RecordViewProps {
  collectionName?: string;
  recordId?: string;
  onClose?: () => void; // if used in a modal/drawer later
}

export function recordview({ collectionname: propcollection, recordid: propid }: recordviewprops) {
  const { name: paramcollection, id: paramid } = useparams();
  const collectionname = propcollection || paramcollection;
  const recordid = propid || paramid;

  const { client } = useauth();
  const navigate = usenavigate();

  const [record, setrecord] = usestate<any>(null);
  const [collection, setcollection] = usestate<any>(null);
  const [loading, setloading] = usestate(true);
  const [showproperties, setshowproperties] = usestate(true);

  // template/layout detection
  const [templateconfig, settemplateconfig] = usestate<any>(null);

  useEffect(() => {
    if (!collectionName || !recordId || !client) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let col;
        try {
          const colRes = await client.getCollection(collectionName!);
          col = colRes.data || colRes;
        } catch (e) {
          col = { name: collectionName, fields: [] };
        }

        if (!col.fields || col.fields.length === 0) {
          try {
            const fieldRes = await client.request('get', `collections/${collectionName}/fields`);
            col.fields = fieldRes.data?.data || fieldRes.data || [];
          } catch (e) {
            col.fields = [];
          }
        }
        setCollection(col);

        const recRes = await client.getRecord(collectionName!, recordId!);
        const data = recRes.data || recRes;
        setRecord(data);

        // detect template configuration
        if (data.template_data) {
          try {
            setTemplateConfig(typeof data.template_data === 'string' ? JSON.parse(data.template_data) : data.template_data);
          } catch (e) {
            console.error("Failed to parse template_data", e);
          }
        } else if (data.content && data.content.trim().startsWith('{') && data.content.trim().endsWith('}')) {
          // heuristic: check if content is json
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.layout || parsed.widgets) {
              setTemplateConfig(parsed);
            }
          } catch (e) {/* not json */}
        }
      } catch (e) {
        console.error("Failed to fetch record view", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, recordId, client]);

  const updateRecord = async (data: any) => {
    setRecord((prev: any) => ({ ...prev, ...data }));
    try {
      await client.updateRecord(collectionName!, recordId!, data);
    } catch (e) {
      console.error("Update failed", e);
      toast.error("Failed to update record");
    }
  };

  const updateWidgetData = (source: string, rowIndex: number, patch: any) => {
    // for now, this just updates the local record state or fetches fresh data if it was a real db source
    // in a template document, 'source' usually refers to a database key or a static data key in the template
    setTemplateConfig((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (next.data && next.data[source]) {
        next.data[source] = [...next.data[source]];
        next.data[source][rowindex] = { ...(next.data[source][rowindex] || {}), ...patch };
      }
      return next;
    });

    // if the template document is bound to real databases, we'd trigger updates there too
    // for now, let's just keep it interactive in the sandbox/preview-like document view
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 space-y-8 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-12 w-3/4 bg-muted rounded" />
        <div className="space-y-2">
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!record || !collection) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
        <p>record not found or access denied.</p>
        <Button variant="link" onClick={() => navigate(-1)}>go back</Button>
      </div>
    );
  }

  let bodyField = collection.fields.find((f: any) => f.interface === 'markdown' || f.interface === 'richText');
  if (!bodyField) bodyField = collection.fields.find((f: any) => f.name === 'content' || f.name === 'body' || f.name === 'description');

  const metaFields = collection.fields.filter((f: any) =>
    f.name !== 'id' &&
    f.name !== 'created_at' &&
    f.name !== 'updated_at' &&
    f.name !== 'sort' &&
    f.name !== 'template_data' &&
    f.uiSchema?.title !== 'Id' &&
    f !== bodyField
  );

  const titleField = collection.titleField || collection.fields.find((f: any) => f.name === 'title' || f.name === 'name')?.name || 'id';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-varela">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground h-9 px-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {collection?.uischema?.title || collectionname}
          </Button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground font-medium text-sm truncate max-w-[300px]">{record[titleField] || 'Untitled'}</span>
          {templateconfig && (
            <div className="ml-4 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> template document
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!templateconfig && (
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-xs h-8", !showProperties && "text-muted-foreground")}
              onClick={() => setShowProperties(!showProperties)}
            >
              {showproperties ? 'hide properties' : 'show properties'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
                copy link
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                delete page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className={cn(
        "flex-1 w-full mx-auto px-6 lg:px-12 py-12 flex flex-col gap-8",
        templateConfig ? "max-w-[1400px]" : "max-w-4xl"
      )}>
        {templateconfig ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-10">
              <h1 className="text-4xl font-bold tracking-tight">{record[titleField] || 'Untitled'}</h1>
            </div>
            <LayoutRenderer
              layout={templateConfig.layout}
              data={templateConfig.data || {}}
              onUpdateData={updateWidgetData}
              onAddData={(source, vals) => {
                setTemplateConfig((prev: any) => {
                  if (!prev) return prev;
                  const next = { ...prev };
                  next.data = next.data || {};
                  next.data[source] = [vals, ...(next.data[source] || [])];
                  return next;
                });
                toast.success(`Added row to ${source}`);
              }}
            />
          </div>
        ) : (
          <>
            <div className="group relative">
              <SmartField
                field={{ type: 'string', interface: 'input' }}
                value={record[titleField]}
                onChange={(val) => updateRecord({ [titleField]: val })}
                className="text-4xl font-bold bg-transparent border-none p-0 h-auto focus:ring-0 shadow-none hover:bg-transparent placeholder:text-muted-foreground/20 leading-tight w-full"
              />
            </div>

            {showProperties && metaFields.length > 0 && (
              <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                {metaFields.map((field: any) => (
                  <div key={field.name} className="contents group">
                    <div className="flex items-center gap-2 text-muted-foreground py-1 group-hover:text-foreground transition-colors overflow-hidden">
                      <span className="truncate">{field.uiSchema?.title || field.name}</span>
                    </div>
                    <div className="py-1 min-h-[28px] flex items-center">
                      <SmartField
                        field={field}
                        value={record[field.name]}
                        onChange={(val) => updateRecord({ [field.name]: val })}
                        className="bg-transparent border-transparent hover:bg-muted/50 px-2 -ml-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showproperties && <div className="h-px bg-border/40 w-full my-4" />}

            <div className="min-h-[500px] pb-32">
              {bodyfield ? (
                <SmartField
                  field={bodyField}
                  value={record[bodyField.name]}
                  onChange={(val) => updateRecord({ [bodyField.name]: val })}
                  className="prose prose-invert max-w-none prose-lg focus:outline-none min-h-[300px]"
                  mode="edit"
                />
              ) : (
                <div className="text-muted-foreground italic opacity-50 flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
                  <p>no content field detected.</p>
                  <Button variant="outline" className="mt-4">
                    add content property
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        <BacklinksFooter recordId={recordId!} collectionName={collectionName!} />
      </main>
    </div>
  );
}
