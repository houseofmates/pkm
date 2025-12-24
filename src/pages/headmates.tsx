
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

    const [showHidden, setShowHidden] = useState(false);

    const members = allMembers.filter(m => showHidden || !overrides[m.id]?.hidden);

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

    const handleClearKey = () => {
        localStorage.removeItem('pk_api_key');
        setApiKey('');
        setHasKey(false);
        setAllMembers([]);
        toast.info("API Key cleared");
    };



    // ... inside component ...

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
            setAllMembers(Array.isArray(membersData) ? membersData : []);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to load headmates");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold lowercase tracking-tight">Headmates</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHidden(!showHidden)}
                        className={showHidden ? "bg-accent" : ""}
                    >
                        {showHidden ? "Hide Details" : "Show Hidden"}
                    </Button>
                    {hasKey && <Button variant="destructive" size="sm" onClick={clearKey}>Clear Key</Button>}
                </div>
            </div>

            {!hasKey ? (
                <Card className="max-w-md mx-auto mt-10">
                    <CardHeader>
                        <CardTitle>Connect SimplyPlural</CardTitle>
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
                        <Button className="w-full" onClick={handleSaveKey}>Connect</Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {loading ? (
                        <div className="text-center p-10 animate-pulse text-muted-foreground">Loading members...</div>
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
                                                toast.success(`Fronting: ${member.content.name}`);
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
