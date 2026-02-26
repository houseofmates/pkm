import { HeadmateCard } from "./headmate-card";
import type { ViewProps } from "@/components/views/registry";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export function ContactsView({ data, collection }: ViewProps) {
  const [search, setSearch] = useState("");

  const titleField = collection?.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };

  const filtered = data.filter(m => {
    const title = m[titleField.name] || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* toolbar */}
      <div className="flex items-center p-4 border-b gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} contacts
        </div>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
          {filtered.map(member => (
            <HeadmateCard key={member.id} member={member} collection={collection} className="w-full" />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            no contacts found
          </div>
        )}
      </div>
    </div>
  );
}
