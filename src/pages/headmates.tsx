
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { HeadmateCard } from '@/components/headmate-card';
import { HeadmateContextMenu } from '@/components/headmate-context-menu';
import { useFronter } from '@/contexts/fronter-context';
import { apiRequest } from '@/lib/api-client';
import { isDiscordLinkExpired, PLACEHOLDER_IMAGE } from '@/lib/discord-utils';

// Strict Capitalization Map
// Rule: If case-insensitive match, use value. Else use DB name.
const STRICT_NAMES: Record<string, string> = {
    'l': 'L',
    'c': 'C',
    's': 'S',
    'alastor': 'Alastor',
    'deer': 'Deer',
    'walt': 'Walt',
    'mike': 'Mike'
};

function formatDisplayName(name: string): string {
    const nameLower = name.toLowerCase().trim();
    if (STRICT_NAMES[nameLower]) {
        return STRICT_NAMES[nameLower];
    }
    return name;
}

interface Member {
    id: string;
    content: {
        name: string;
        pronouns?: string;
        avatarUrl?: string;
        desc?: string;
    };
}

export function HeadmatesPage() {
    const { setFronter, activeFronterId, overrides } = useFronter();
    const [apiKey, setApiKey] = useState('');
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    const members = allMembers.filter(m => !overrides[m.id]?.hidden);

    // Define fetchMembers first to avoid usage before declaration
    const fetchMembers = async (key: string) => {
        setLoading(true);
        try {
            // 1. Fetch System ID (User)
            const meData = await apiRequest('simplyplural', 'me', {
                headers: { 'Authorization': key }
            });

            if (!meData || !meData.id) {
                throw new Error("Could not fetch system information. Chek API key.");
            }

            const systemId = meData.id;

            // 2. Fetch Members using System ID
            // Endpoint: /v1/members/:systemId
            const membersData = await apiRequest('simplyplural', `members/${systemId}`, {
                headers: { 'Authorization': key }
            });

            // SimplyPlural returns array of members directly
            const rawMembers = Array.isArray(membersData) ? membersData : [];

            // Sanitize members (check for dead Discord links)
            const sanitizedMembers = rawMembers.map((m: any) => {
                // Check if link is expired (includes media.discordapp.net and images-ext-2.discordapp.net)
                if (m.content?.avatarUrl && isDiscordLinkExpired(m.content.avatarUrl)) {
                    // Silenced log per user request
                    // console.warn(`[Fix] replaced expired Discord link for ${m.content.name}`);
                    return {
                        ...m,
                        content: {
                            ...m.content,
                            avatarUrl: PLACEHOLDER_IMAGE // Use placeholder if check fails
                        }
                    };
                }
                return m;
            });

            setAllMembers(sanitizedMembers);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to load headmates");
            // If auth fails, maybe clear the key? 
            // setHasKey(false); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedKey = localStorage.getItem('pk_api_key');
        if (storedKey) {
            setApiKey(storedKey);
            setHasKey(true);
            fetchMembers(storedKey);
        }
    }, []);

    const handleSaveKey = () => {
        if (!apiKey) return;
        localStorage.setItem('pk_api_key', apiKey);
        setHasKey(true);
        toast.success("API Key saved locally");
        fetchMembers(apiKey);
    };





    // ... inside component ...



    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold lowercase tracking-tight">headmates</h1>

            </div>

            {!hasKey ? (
                <Card className="max-w-md mx-auto mt-10">
                    <CardHeader>
                        <CardTitle>connect simplyplural</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                placeholder="Enter SimplyPlural API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your key is stored locally in your browser.
                            </p>
                        </div>
                        <Button className="w-full" onClick={handleSaveKey}>connect</Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center p-10">
                            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full animate-loading-bar"
                                    style={{ backgroundColor: '#f6b012' }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {members.map(member => (
                                <HeadmateContextMenu
                                    key={member.id}
                                    memberId={member.id}
                                    memberName={member.content.name}
                                >
                                    <HeadmateCard
                                        member={member}
                                        onClick={() => {
                                            // Toggle if already selected, or just select? User said "selects the headmate as the current fronter"
                                            // Let's toggle for UX convenience
                                            setFronter(activeFronterId === member.id ? null : member.id);
                                            if (activeFronterId !== member.id) {
                                                toast.success(`Fronting: ${formatDisplayName(member.content.name)}`);
                                            }
                                        }}
                                    />
                                </HeadmateContextMenu>
                            ))}
                            {members.length === 0 && (
                                <div className="col-span-full text-center p-10 text-muted-foreground">
                                    No members found or API key invalid.
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
