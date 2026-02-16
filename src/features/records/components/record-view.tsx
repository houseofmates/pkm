import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SmartField } from '@/components/fields/smart-field';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreHorizontal, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BacklinksFooter } from '@/components/BacklinksFooter';

interface RecordViewProps {
  collectionName?: string;
  recordId?: string;
  onClose?: () => void; // If used in a modal/drawer later
}

export function RecordView({ collectionName: propCollection, recordId: propId }: RecordViewProps) {
  const { name: paramCollection, id: paramId } = useParams();
  const collectionName = propCollection || paramCollection;
  const recordId = propId || paramId;

  const { client } = useAuth();
  const navigate = useNavigate();

  const [record, setRecord] = useState<any>(null);
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  useEffect(() => {
  if (!collectionName || !recordId || !client) return;

  const fetchData = async () => {
  setLoading(true);
  try {
 // 1. Fetch Collection Metadata (for fields)
 // In a real app we might cache this or use a hook
 const colRes = await client.listCollections();
 // Find our specific collection
 const col = colRes.data?.find((c: any) => c.name === collectionName) || { name: collectionName, fields: [] };

 // If we don't have fields, we might need to fetch them specifically if the listCollections didn't return them
 // Assuming NocoBase client structure based on Recon
 if (!col.fields || col.fields.length === 0) {
 const fieldRes = await client.request({ url: `collections/${collectionName}/fields` });
 col.fields = fieldRes.data?.data || fieldRes.data || [];
 }
 setCollection(col);

 // 2. Fetch Record Data
 const recRes = await client.getRecord(collectionName, recordId);
 setRecord(recRes.data);
  } catch (e) {
 console.error("Failed to fetch record view", e);
  } finally {
 setLoading(false);
  }
  };

  fetchData();
  }, [collectionName, recordId, client]);

  const updateRecord = async (data: any) => {
  // Optimistic update
  setRecord((prev: any) => ({ ...prev, ...data }));
  try {
  await client.updateRecord(collectionName!, recordId!, data);
  } catch (e) {
  console.error("Update failed", e);
  // Revert on fail?
  }
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
 <p>Record not found or access denied.</p>
 <Button variant="link" onClick={() => navigate(-1)}>Go Back</Button>
  </div>
  );
  }

  // Identify special fields
  // We want to separate the "Body" (Content) from the "Properties" (Metadata)
  // Heuristic: "content", "body", "note", "description" is body. Rest is metadata.
  // If multiple candidates, usually the Long Text / Markdown one is body.

  let bodyField = collection.fields.find((f: any) => f.interface === 'markdown' || f.interface === 'richText');
  if (!bodyField) bodyField = collection.fields.find((f: any) => f.name === 'content' || f.name === 'body' || f.name === 'description');

  const metaFields = collection.fields.filter((f: any) =>
  f.name !== 'id' &&
  f.name !== 'created_at' &&
  f.name !== 'updated_at' &&
  f.name !== 'sort' &&
  f.uiSchema?.title !== 'Id' &&
  f !== bodyField
  );

  const titleField = collection.titleField || collection.fields.find((f: any) => f.name === 'title' || f.name === 'name')?.name || 'id';


  return (
  <div className="min-h-screen bg-background text-foreground flex flex-col font-varela">
  {/* Minimal Header */}
  <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm transition-all">
 <div className="flex items-center gap-2">
 <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
 <ArrowLeft className="h-4 w-4 mr-1" />
 {collection?.uiSchema?.title || collectionName}
 </Button>
 <span className="text-muted-foreground/30">/</span>
 <span className="text-muted-foreground text-xs truncate max-w-[200px]">{record[titleField] || 'Untitled'}</span>
 </div>

 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 className={cn("text-xs", !showProperties && "text-muted-foreground")}
 onClick={() => setShowProperties(!showProperties)}
 >
 {showProperties ? 'hide properties' : 'show properties'}
 </Button>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
   <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
   <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
   Copy Link
   </DropdownMenuItem>
   <DropdownMenuItem className="text-destructive">
   Delete Page
   </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
  </header>

  {/* Main Content Scroll Area */}
  <main className="flex-1 max-w-4xl w-full mx-auto px-12 py-12 flex flex-col gap-8">

 {/* 1. Title Area */}
 <div className="group relative">
 <SmartField
 field={{ type: 'string', interface: 'input' }}
 value={record[titleField]}
 onChange={(val) => updateRecord({ [titleField]: val })}
 className="text-4xl font-bold bg-transparent border-none p-0 h-auto focus:ring-0 shadow-none hover:bg-transparent placeholder:text-muted-foreground/20 leading-tight w-full"
 />
 </div>

 {/* 2. Metadata Properties (Notion Style) */}
 {showProperties && metaFields.length > 0 && (
 <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
 {metaFields.map((field: any) => (
   <div key={field.name} className="contents group">
   <div className="flex items-center gap-2 text-muted-foreground py-1 group-hover:text-foreground transition-colors overflow-hidden">
   {/* Icons based on type could go here */}
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

 {/* Divider if properties are shown */}
 {showProperties && <div className="h-px bg-border/40 w-full my-4" />}

 {/* 3. The Body (Canvas / Content) */}
 <div className="min-h-[500px] pb-32">
 {bodyField ? (
 <SmartField
   field={bodyField}
   value={record[bodyField.name]}
   onChange={(val) => updateRecord({ [bodyField.name]: val })}
   className="prose prose-invert max-w-none prose-lg focus:outline-none min-h-[300px]"
   mode="edit" // Force edit mode for the body? Or build a "Click to Edit" wrapper?
 // For now, SmartField handles click-to-edit.
 // In "Vibe" phase 2, we might want a seamless Block Editor.
 />
 ) : (
 <div className="text-muted-foreground italic opacity-50 flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
   <p>No content field detected.</p>
   <Button variant="outline" className="mt-4" onClick={() => {/* Add field logic */ }}>
   Add Content Property
   </Button>
 </div>
 )}

 </div>

 {/* 4. Linked Mentions */}
 <BacklinksFooter recordId={recordId} collectionName={collectionName} />

  </main>
  </div>
  );
}
