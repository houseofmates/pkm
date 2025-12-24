
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuLabel,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface HeadmateContextMenuProps {
    memberId: string;
    memberName: string;
    children: React.ReactNode;
}

export function HeadmateContextMenu({ memberId, memberName, children }: HeadmateContextMenuProps) {
    const { client } = useAuth();
    const { overrides, updateOverride } = useFronter();
    const currentOverride = overrides[memberId] || {};

    const [editOpen, setEditOpen] = useState(false);
    const [colorOpen, setColorOpen] = useState(false);

    // Edit State
    const [desc, setDesc] = useState('');

    // Color State
    const [color, setColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#ffffff');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading avatar...");
        try {
            const res = await client.upload(file);
            // NocoBase upload response usually returns the file object in data
            const uploadedFile = res.data;

            if (uploadedFile && uploadedFile.url) {
                updateOverride(memberId, { avatarUrl: uploadedFile.url });
                toast.success("Avatar updated", { id: toastId });
            } else {
                console.error("Upload response:", res);
                throw new Error("No URL returned from upload");
            }
        } catch (error) {
            console.error(error);
            toast.error("Upload failed", { id: toastId });
        }
    };

    const openEdit = () => {
        setDesc(currentOverride.description || '');
        setEditOpen(true);
    };

    const openColor = () => {
        setColor(currentOverride.color || '#cccccc');
        setTextColor(currentOverride.textColor || '#ffffff');
        setColorOpen(true);
    };

    const saveDetails = () => {
        updateOverride(memberId, { description: desc });
        setEditOpen(false);
        toast.success("Details saved");
    };

    const saveColors = () => {
        updateOverride(memberId, { color, textColor });
        setColorOpen(false);
        toast.success("Colors saved");
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                    <ContextMenuLabel>{memberName}</ContextMenuLabel>
                    <ContextMenuSeparator />

                    <ContextMenuItem onSelect={() => fileInputRef.current?.click()}>
                        <Image className="mr-2 h-4 w-4" />
                        Change Image
                    </ContextMenuItem>

                    <ContextMenuItem onSelect={openEdit}>
                        <FileText className="mr-2 h-4 w-4" />
                        Edit Description
                    </ContextMenuItem>

                    <ContextMenuItem onSelect={openColor}>
                        <Palette className="mr-2 h-4 w-4" />
                        Customize Colors
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            {/* Edit Description Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Custom Description</Label>
                            <Textarea
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Enter a custom description that overrides the SimplyPlural one..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={saveDetails}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Color Dialog */}
            <Dialog open={colorOpen} onOpenChange={setColorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Customize Colors</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Main Color (Border/Glow)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    className="w-12 h-10 p-1"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                />
                                <Input
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Name Text Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    className="w-12 h-10 p-1"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                />
                                <Input
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={saveColors}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
