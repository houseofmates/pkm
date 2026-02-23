import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LayoutGrid, Contact } from 'lucide-react';
import { HeadmateCard } from '@/features/headmates/components/headmate-card';
import { HeadmateContextMenu } from '@/features/headmates/components/headmate-context-menu';
import { useFronter } from '@/contexts/fronter-context';
import { PLACEHOLDER_IMAGE } from '@/lib/discord-utils';
import { SimplyPluralClient } from '@/lib/simply-plural-client';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { formatHeadmateName } from '@/utils/text-formatting';
import { syncHeadmatesToNocoBase } from '@/utils/sync-headmates';

// helper for strict name capitalization (delegated to utility)
const formatName = formatHeadmateName;

interface Member {
  id: string;
  content: {
    name: string;
    pronouns?: string;
    avatarUrl?: string;
    desc?: string;
  };
}

function SortableHeadmateCard({
  id,
  children,
  isDragging,
}: {
  id: string;
  children: React.ReactNode;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function HeadmatesPage() {
  const { toggleFronter, overrides, setOverrides, cacheMemberColors, activeFronters } = useFronter();
  const [apiKey, setApiKey] = useState('');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'contacts'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  // const [systemid, setsystemid] = useState<string | null>(null); // unused local state, context handles it.

  const members = allMembers.filter(m => !overrides[m.id]?.hidden);
  const activeFrontId = activeFronters[0];

  // log for debugging
  useEffect(() => {
    console.log('Active fronters:', activeFronters);
    console.log('All member IDs:', allMembers.map(m => ({ id: m.id, name: m.content.name })));
  }, [activeFronters, allMembers]);

  const activeFrontColor = activeFrontId
    ? (overrides[activeFrontId]?.color || allMembers.find(m => m.id === activeFrontId)?.content?.color)
    : undefined;

  const baseOrderIndex = useMemo(() => {
    const map = new Map<string, number>();
    allMembers.forEach((m, idx) => map.set(m.id, idx));
    return map;
  }, [allMembers]);

  const orderedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const orderA = overrides[a.id]?.order ?? baseOrderIndex.get(a.id) ?? 0;
      const orderB = overrides[b.id]?.order ?? baseOrderIndex.get(b.id) ?? 0;
      return orderA - orderB;
    });
  }, [members, overrides, baseOrderIndex]);

  const orderedIds = useMemo(() => orderedMembers.map(m => m.id), [orderedMembers]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    const newOverrides = { ...overrides };
    newOrder.forEach((id, index) => {
      newOverrides[id] = { ...newOverrides[id], order: index };
    });
    setOverrides(newOverrides);
  };

  const fetchMembers = async (key: string) => {
    setLoading(true);
    console.log("Fetching SimplyPlural members with key length:", key?.length);

    try {
      // 1. fetch "me" to get system id
      // using direct fetch to avoid nocobase proxy issues on mobile
      const meRes = await fetch(SimplyPluralClient.url('/me'), {
        headers: { 'Authorization': key }
      });

      if (!meRes.ok) {
        const errText = await meRes.text();
        console.error("SimplyPlural 'me' Error:", meRes.status, errText);
        throw new Error(`SimplyPlural Login Failed (${meRes.status}): ${errText}`);
      }

      const meData = await meRes.json();
      if (!meData || !meData.id) {
        console.error("SimplyPlural Invalid Me Data:", meData);
        throw new Error("Could not fetch system information. Response invalid.");
      }

      const sid = meData.id;
      // setsystemid(sid); // store system id
      console.log("SimplyPlural System ID:", sid);

      // 2. fetch members
      const membersRes = await fetch(SimplyPluralClient.url(`/members/${sid}`), {
        headers: { 'Authorization': key }
      });

      if (!membersRes.ok) {
        const errText = await membersRes.text();
        console.error("SimplyPlural 'members' Error:", membersRes.status, errText);
        throw new Error(`Failed to fetch members (${membersRes.status}): ${errText}`);
      }

      const membersData = await membersRes.json();
      const rawMembers = Array.isArray(membersData) ? membersData : [];
      console.log("SimplyPlural Members Found:", rawMembers.length);

      // sanitize members (aggressive pre-render check)
      const sanitizedMembers = rawMembers.map((m: any) => {
        let avatarUrl = m.content?.avatarUrl || "";

        // aggressive check: if it's a discordapp.net link (media or images-ext-2), kill it.
        if (avatarUrl.includes('discordapp.net')) {
          avatarUrl = PLACEHOLDER_IMAGE;
        }

        // apply strict name formatting
        const originalName = m.content?.name || "Unknown";
        // we format it here to ensure the state object is clean
        const formattedName = formatName(originalName);

        // extract and format color
        let color = m.content?.color || m.color;
        if (color && !color.startsWith('#')) {
          color = `#${color}`;
        }

        console.log(`[Headmate] ${formattedName}: color=${color}`);

        return {
          ...m,
          content: {
            ...m.content,
            name: formattedName,
            avatarUrl: avatarUrl,
            color: color
          }
        };
      });

      setAllMembers(sanitizedMembers);
      cacheMemberColors(sanitizedMembers); // SYNC COLORS TO CONTEXT

      // --- sync check: reconcile external image changes ---
      // if simplyplural avatar differs from our local override, assume sp is newer and clear override.
      const newOverrides = { ...overrides };
      let overridesChanged = false;

      sanitizedMembers.forEach((m: any) => {
        const spAvatar = m.content.avatarUrl || "";
        const currentOverride = newOverrides[m.id];
        const overrideAvatar = currentOverride?.avatarUrl;

        if (overrideAvatar) {
          let matches = false;

          // case 1: identical strings
          if (overrideAvatar === spAvatar) matches = true;

          // case 2: override is relative (local upload path) and sp has specific url
          // note: if sp has the nocobase url, it might be absolute.
          // we check if spavatar *contains* the override path if relative.
          if (overrideAvatar.startsWith('/')) {
            // e.g. /storage/uploads/xyz.png vs https://db.../storage/uploads/xyz.png
            const nocobaseUrl = import.meta.env.VITE_NOCOBASE_URL || '';
            if (spAvatar.endsWith(overrideAvatar) || (nocobaseUrl && spAvatar.includes(nocobaseUrl))) matches = true;
          }

          if (!matches && spAvatar.length > 0) {
            // sp has a valid avatar that does not match our override.
            // we trust sp as the source of truth for updates.
            console.log(`Sync Logic: Removing stale avatar override for ${m.content.name}. SP: ${spAvatar.slice(-20)} vs Local: ${overrideAvatar.slice(-20)}`);

            // remove avatarurl from override, keep other fields
            delete (currentOverride as any).avatarUrl;

            // if override is now empty/useless, maybe delete the whole key?
            // for now just removing the avatarurl property is safer to preserve colors/names.
            overridesChanged = true;
          }
        }
      });

      if (overridesChanged) {
        console.log("Sync Logic: Applying override updates...");
        setOverrides(newOverrides);
      }

    } catch (error: any) {
      // console.error("full simplyplural error:", error);
      // keep console error minimal or remove if not needed for user debugging
      toast.error(error.message || "Failed to load headmates");
    } finally {
      setLoading(false);
    }
  };

  // sync reconciliation effect
  useEffect(() => {
    if (allMembers.length === 0) return;

    let overridesChanged = false;
    const newOverrides = { ...overrides };

    allMembers.forEach(m => {
      const spAvatar = m.content.avatarUrl || "";
      const currentOverride = newOverrides[m.id];
      const overrideAvatar = currentOverride?.avatarUrl;

      // only check if we actually have an override to potentially clear
      if (overrideAvatar) {
        let matches = false;

        // case 1: identical strings
        if (overrideAvatar === spAvatar) matches = true;

        // case 2: override is relative (local upload path) and sp has specific url
        // e.g. /storage/uploads/xyz.png vs https://db.../storage/uploads/xyz.png
        if (overrideAvatar.startsWith('/')) {
          if (spAvatar.endsWith(overrideAvatar)) matches = true;
        }

        // if sp has a valid avatar that does not match our override
        if (!matches && spAvatar.length > 0) {
          console.log(`Sync Logic: Removing stale avatar override for ${m.content.name}`);

          // remove avatarurl from override
          delete (currentOverride as any).avatarUrl;

          // if the override object is now effectively empty (only key remains?),
          // we might ideally delete the key, but keeping the object is safer for now.
          overridesChanged = true;
        }
      }
    });

    if (overridesChanged) {
      setOverrides(newOverrides);
    }
  }, [allMembers, overrides, setOverrides]);

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
    toast.success("api key saved locally");
    fetchMembers(apiKey);
  };



  return (
    <div className="p-4 md:p-8 space-y-4 h-full overflow-auto">
      <div className="flex items-center justify-between gap-3">
        <h1
          className="text-2xl md:text-3xl font-bold lowercase leading-none text-primary"
        >
          headmates
        </h1>
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg h-9">
          <button
            onClick={() => setViewMode('grid')}
            className={`h-7 w-7 rounded-md transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('contacts')}
            className={`h-7 w-7 rounded-md transition-all flex items-center justify-center ${viewMode === 'contacts' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="contacts view"
          >
            <Contact size={16} />
          </button>
        </div>
      </div>

      {!hasKey ? (
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle>connect simplyplural</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>api key</Label>
              <Input
                type="password"
                placeholder="enter simplyplural api key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                your key is stored locally on your device.
              </p>
            </div>
            <Button className="w-full" onClick={handleSaveKey}>connect</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setLoading(true);
                  await syncHeadmatesToNocoBase(apiKey);
                } catch (e) {
                  console.error('Sync failed:', e);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              sync to nocobase
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-loading-bar"
                  style={{ backgroundColor: 'var(--primary)' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedIds}
                  strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
                >
                  <div className={`
  grid gap-4
  ${viewMode === 'grid'
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' // Contacts view: Larger cards
                    }
   `}>
                    {orderedMembers.map(member => {
                      // transform member data to match headmatecard expected structure
                      const flatMember = {
                        id: member.id,
                        name: member.content.name,
                        avatar: member.content.avatarUrl,
                        pronouns: member.content.pronouns,
                        description: member.content.desc,
                        color: overrides[member.id]?.color || member.content.color,
                        textcolor: overrides[member.id]?.textcolor || member.content.textcolor
                      };
                      return (
                        <SortableHeadmateCard key={member.id} id={member.id} isDragging={isDragging}>
                          <HeadmateContextMenu
                            memberId={member.id}
                            memberName={member.content.name}
                          >
                            {viewMode === 'grid' ? (
                              <HeadmateCard
                                member={flatMember}
                                onClick={isDragging ? undefined : () => toggleFronter(member.id)}
                              />
                            ) : (
                              // contacts view rendering (reusing headmatecard but maybe we can style it differently via classname?)
                              // for now, let's just use headmatecard but in a list/larger grid.
                              // ideally we'd have a specific "contactcard" layout (horizontal?).
                              // let's stick to headmatecard for consistency but bigger.
                              <HeadmateCard
                                member={flatMember}
                                onClick={isDragging ? undefined : () => toggleFronter(member.id)}
                                className="aspect-[1.8/1]" // Wider aspect ratio for 'contact card' feel?
                              />
                            )}
                          </HeadmateContextMenu>
                        </SortableHeadmateCard>
                      );
                    })}
                    {orderedMembers.length === 0 && (
                      <div className="col-span-full text-center p-10 text-muted-foreground">
                        no members found or api key invalid.
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </>
      )}
    </div>
  );
}
