
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCollections } from "@/hooks/use-collections";
import { useState } from "react";
import { CreateRecordDialog } from "@/components/create-record-dialog";

export function QuickAddWidget() {
  const { collections } = useCollections();
  const [open, setOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const handleOpen = (name: string) => {
  setselectedcollection(name);
  setopen(true);
  }

  return (
  <div className="h-full flex flex-col gap-2 p-2 overflow-y-auto">
  {collections.map((col: { name: string; title?: string; fields?: any[] }) => (
 <Button
 key={col.name}
 variant="outline"
 className="w-full justify-start gap-2"
 onClick={() => handleOpen(col.name)}
 >
 <Plus className="h-4 w-4 text-muted-foreground" />
 <span className="truncate">add to {col.title || col.name}</span>
 </Button>
  ))}

  {selectedcollection && (
 <CreateRecordDialog
 collectionName={selectedCollection}
 fields={collections.find((c: { name: string; fields?: any[] }) => c.name === selectedCollection)?.fields || []}
 open={open}
 onOpenChange={(v: boolean) => { setopen(v); if (!v) setselectedcollection(null); }}
 trigger={<></>}
 />
  )}
  </div>
  )
}
