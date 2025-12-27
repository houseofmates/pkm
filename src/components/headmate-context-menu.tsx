
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
import { Image, FileText, Trash2, Edit, Upload, Palette } from 'lucide-react';
import { toast } from 'sonner';

// Names that should always be displayed in uppercase
const UPPERCASE_NAMES = ['alastor', 'deer', 'mike', 'walt'];

function formatDisplayName(name: string): string {
    const nameLower = name.toLowerCase().trim();
    if (UPPERCASE_NAMES.includes(nameLower)) {
        return name.toUpperCase();
    }
    return name;
}

interface HeadmateContextMenuProps {
    memberId: string;
    memberName: string;
    children: React.ReactNode;
}

export function HeadmateContextMenu({ memberId, memberName, children }: HeadmateContextMenuProps) {
    const { client } = useAuth();
    const { overrides, updateOverride, flushOverrides } = useFronter();
    const currentOverride = overrides[memberId] || {};

    const [editOpen, setEditOpen] = useState(false);
    const [colorOpen, setColorOpen] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [nameOpen, setNameOpen] = useState(false);

    // Edit State
    const [desc, setDesc] = useState('');
    const [visualName, setVisualName] = useState('');

    // Image State
    const [imageUrl, setImageUrl] = useState('');

    // Color State
    const [color, setColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#ffffff');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isHidden = currentOverride.hidden;

    const toggleHide = () => {
        updateOverride(memberId, { hidden: !isHidden });
        toast.info(isHidden ? "Headmate restored" : "Headmate hidden");
    };

    // --- Image Handling ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Uploading avatar...");
        try {
            // Upload directly to NocoBase attachments
            const res = await client.upload(file);
            console.log('Full Upload response:', JSON.stringify(res, null, 2));
            
            // NocoBase returns { data: { ... } } or just the attachment object
            const uploadedFile = res?.data || res;
            console.log('Uploaded file data:', JSON.stringify(uploadedFile, null, 2));

            if (uploadedFile) {
                // Save relative URL to work with proxy (avoids CORS)
                // The URL should be relative like /storage/uploads/filename.jpg
                let avatarUrl = '';
                
                if (uploadedFile.url) {
                    // Use relative URL directly (e.g., /storage/uploads/file.jpg)
                    avatarUrl = uploadedFile.url.startsWith('/') ? uploadedFile.url : `/${uploadedFile.url}`;
                } else if (uploadedFile.filename) {
                    // Construct from filename
                    avatarUrl = `/storage/uploads/${uploadedFile.filename}`;
                } else if (uploadedFile.id) {
                    // Fallback to attachment ID
                    avatarUrl = `/storage/uploads/${uploadedFile.id}`;
                }

                console.log('Final avatar URL (relative for proxy):', avatarUrl);

                if (avatarUrl) {
                    console.log('Setting Override URL:', avatarUrl, 'for member:', memberId);
                    updateOverride(memberId, { avatarUrl });

                    // Flush immediately to ensure persistence
                    try {
                        await flushOverrides();
                        console.log('Overrides flushed successfully');
                    } catch (flushError) {
                        console.warn('Failed to flush overrides:', flushError);
                    }

                    toast.success("Avatar updated", { id: toastId });
                } else {
                    toast.error("Could not get image URL from upload", { id: toastId });
                }

                // Reset file input and close dialog
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setImageOpen(false);
            } else {
                toast.error("Upload returned empty response", { id: toastId });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error("Upload failed", { id: toastId });
        }
    };

    const saveImageUrl = async () => {
        if (!imageUrl.trim()) return;
        updateOverride(memberId, { avatarUrl: imageUrl.trim() });

        // Flush immediately to ensure persistence
        try {
            await flushOverrides();
        } catch (flushError) {
            console.warn('Failed to flush overrides:', flushError);
        }

        toast.success("Image link saved");
        setImageUrl(''); // Clear input after saving
        setImageOpen(false);
    };

    // --- Name/Desc ---
    const openEdit = () => {
        setDesc(currentOverride.description || '');
        setEditOpen(true);
    };

    const openNameEdit = () => {
        setVisualName((currentOverride as any).name || memberName);
        setNameOpen(true);
    };

    const saveDetails = () => {
        updateOverride(memberId, { description: desc });
        setEditOpen(false);
        toast.success("Description saved");
    };

    const saveVisualName = () => {
        updateOverride(memberId, ({ name: visualName } as any));
        setNameOpen(false);
        toast.success("Visual name saved");
    };

    // --- Colors ---
    const openColor = () => {
        setColor(currentOverride.color || '#cccccc');
        setTextColor(currentOverride.textColor || '#ffffff');
        setColorOpen(true);
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
                    <ContextMenuLabel>{formatDisplayName((currentOverride as any).name || memberName)}</ContextMenuLabel>
                    <ContextMenuSeparator />

                    <ContextMenuItem onSelect={openNameEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Visual Name
                    </ContextMenuItem>

                    <ContextMenuItem onSelect={() => setImageOpen(true)}>
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

                    <ContextMenuSeparator />

                    <ContextMenuItem
                        className={isHidden ? "" : "text-destructive focus:text-destructive-foreground focus:bg-destructive"}
                        onSelect={toggleHide}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isHidden ? "Unhide Headmate" : "Hide Headmate"}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {/* Hidden File Input for direct click if needed, but using dialog now mostly */}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

            {/* Visual Name Dialog */}
            <Dialog open={nameOpen} onOpenChange={setNameOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>edit visual name</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Label>name (overrides integration)</Label>
                        <Input value={visualName} onChange={e => setVisualName(e.target.value)} className="mt-2" />
                    </div>
                    <DialogFooter><Button onClick={saveVisualName}>save</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Source Dialog */}
            <Dialog open={imageOpen} onOpenChange={setImageOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>change image</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-6 w-6" />
                                Upload from Device
                            </Button>

                            {/* Simple visual separator or just standard layout */}
                            <div className="col-span-2 border-t pt-4">
                                <Label>or paste image link</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                                    <Button onClick={saveImageUrl}>save</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Description Dialog (Existing) */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>edit details</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>custom description</Label>
                            <Textarea
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Enter a custom description..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={saveDetails}>save</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Color Dialog (Existing) */}
            <Dialog open={colorOpen} onOpenChange={setColorOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>customize colors</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>main color</Label>
                            <div className="flex gap-2">
                                <Input type="color" className="w-12 h-10 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
                                <Input value={color} onChange={(e) => setColor(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>text color</Label>
                            <div className="flex gap-2">
                                <Input type="color" className="w-12 h-10 p-1" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                                <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={saveColors}>save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}