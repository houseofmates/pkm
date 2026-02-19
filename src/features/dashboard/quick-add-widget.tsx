
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCollections } from "@/hooks/use-collections";
import { useState } from "react";
import { CreateRecordDialog } from "@/components/create-record-dialog";

export function QuickAddWidget() {
  const { collections } = useCollections();
  const [open, setOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const handleOpen = (Name: string) => {
  setselectedcollection(Name);
  setopen(true);
  }

  return (
  <div className="h-full flex flex-col gap-2 p-2 overflow-y-auto">
  {collections.map((col: { Name: string; title?: string; fields?: any[] }) => (
 <Button
 key={col.Name}
 variant="outline"
 className="w-full justify-start gap-2"
 onClick={() => handleOpen(col.Name)}
 >
 <Plus className="h-4 w-4 text-muted-foreground" />
 <span className="truncate">add to {col.title || col.Name}</span>
 </Button>
  ))}

  {selectedcollection && (
 <CreateRecordDialog
 collectionName={selectedCollection}
 fields={collections.find((c: { Name: string; fields?: any[] }) => c.Name === selectedCollection)?.fields || []}
 open={open}
 onOpenChange={(v: boolean) => { setopen(v); if (!v) setselectedcollection(null); }}
 trigger={<></>}
 />
  )}
  </div>
  )
}
