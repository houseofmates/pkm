
import * as React from "react"
import {
    CalendarIcon,
    EnvelopeClosedIcon,
    FaceIcon,
    GearIcon,
    PersonIcon,
    RocketIcon,
} from "@radix-ui/react-icons"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut
} from "@/components/ui/command"
import { useNavigate } from "react-router-dom";
import { useCollections } from "@/hooks/use-collections";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Search, Database } from "lucide-react";
import { CreateRecordDialog } from "@/components/create-record-dialog";

export function GlobalCommandPalette() {
    const [open, setOpen] = React.useState(false)
    const navigate = useNavigate();
    const { collections } = useCollections();
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
    const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    const handleCreate = (collectionName: string) => {
        setSelectedCollection(collectionName);
        setOpen(false);
        setCreateDialogOpen(true);
    }

    if (!open) return null;

    return (
        <CommandItem key={col.name} onSelect={() => runCommand(() => navigate(`/databases/${col.name}`))}>
            <Database className="mr-2 h-4 w-4" />
            <span>{col.title || col.name}</span>
        </CommandItem>
    ))
}
                    </CommandGroup >
                    <CommandSeparator />
                    <CommandGroup heading="Quick Capture">
                        {collections.map(col => (
                            <CommandItem key={`create-${col.name}`} onSelect={() => handleCreate(col.name)}>
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Add to {col.title || col.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList >
            </CommandDialog >

    { selectedCollection && (
        <CreateRecordDialog
            collectionName={selectedCollection}
            fields={collections.find(c => c.name === selectedCollection)?.fields || []}
            trigger={<></>} // Hidden trigger
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
        />
    )}
        </>
    )
}
