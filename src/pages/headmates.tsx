
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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
    const [apiKey, setApiKey] = useState('');
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasKey, setHasKey] = useState(false);

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
        setMembers([]);
        toast.info("API Key cleared");
    };

    const fetchMembers = async (key: string) => {
        setLoading(true);
        try {
            // Use local proxy to bypass CORS
            // Was: https://api.apparyllis.com/v1/members
            const response = await fetch('/api/simplyplural/members', {
                headers: {
                    'Authorization': key
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch members: ${response.status}`);
            }

            const data = await response.json();
            // SimplyPlural returns list of members directly or in a specific structure. 
            // Documentation says it returns array of members.
            // Let's assume it is an array for now, or check typical response.
            // Actually it's cleaner to just render what we get.
            // If strictly SimplyPlural, expected format is array.
            setMembers(data);
        } catch (error: any) {
            console.error(error);
            if (error.message === 'Failed to fetch') {
                toast.error("Network Error: Possible CORS issue. This API may block browser requests.");
            } else {
                toast.error(error.message || "Failed to load headmates");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 h-full overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold lowercase tracking-tight">Headmates</h1>
                {hasKey && <Button variant="outline" onClick={handleClearKey} size="sm">Clear Key</Button>}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {members.map(member => (
                                <Card key={member.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                                    <div className="h-24 bg-muted/30 flex items-center justify-center relative">
                                        {member.content.avatarUrl ? (
                                            <img
                                                src={member.content.avatarUrl}
                                                alt={member.content.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="text-4xl opacity-20">?</div>
                                        )}
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-bold text-lg mb-1">{member.content.name}</h3>
                                        <p className="text-xs text-muted-foreground">{member.content.pronouns}</p>
                                        <p className="text-xs mt-2 line-clamp-2 opacity-70">{member.content.desc}</p>
                                    </CardContent>
                                </Card>
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
