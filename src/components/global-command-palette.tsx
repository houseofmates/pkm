
import React from "react";
import { User, Rocket, Database, Plus } from "lucide-react";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from 'react-router-dom';
import { useCollections } from "@/hooks/use-collections";
// import { CreateRecordDialog } from './create-record-dialog'; // Assuming this exists or will exist

export function GlobalCommandPalette() {
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();
    const { collections } = useCollections();

    // Quick Capture State
    const [_createDialogOpen, _setCreateDialogOpen] = React.useState(false);
    const [_selectedCollection, _setSelectedCollection] = React.useState<string | null>(null);

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

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
                <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl" onClick={e => e.stopPropagation()}>
                    <Command className="rounded-xl border shadow-md">
                        <CommandInput placeholder="Type a command or search..." />
                        <CommandList>
                            <CommandEmpty>no results found.</CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    <span>Home Dashboard</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => navigate('/headmates'))}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Headmates</span>
                                </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Databases">
                                {collections.map((collection) => (
                                    <CommandItem key={collection.name} onSelect={() => runCommand(() => {
                                        _setSelectedCollection(collection.name);
                                        navigate(`/databases/${collection.name}`);
                                    })}>
                                        <Database className="mr-2 h-4 w-4" />
                                        <span>{collection.title || collection.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Quick Capture">
                                <CommandItem onSelect={() => runCommand(() => _setCreateDialogOpen(true))}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Quick Note / Task</span>
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </div>
            </div>

            {/* <CreateRecordDialog 
            open={createDialogOpen} 
            onOpenChange={setCreateDialogOpen} 
            defaultCollection={selectedCollection}
        /> */}
        </>
    )
}
