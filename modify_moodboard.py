import sys

path = 'src/pages/moodboard.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Add import cn
if "import { cn } from '@/lib/utils';" not in content:
    content = content.replace("import { Input } from '@/components/ui/input';", "import { Input } from '@/components/ui/input';\nimport { cn } from '@/lib/utils';")

# 2. Add state
if "const [editingId, setEditingId]" not in content:
    content = content.replace("const [dragState, setDragState] = useState<{ id: string, mode: 'move' | 'resize', startX: number, startY: number, initial: any } | null>(null);", "const [dragState, setDragState] = useState<{ id: string, mode: 'move' | 'resize', startX: number, startY: number, initial: any } | null>(null);\n  const [editingId, setEditingId] = useState<string | null>(null);")

# 3. Update parent div interaction
parent_old = """                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.button === 0) {
                    setDragState({
                      id: el.id,
                      mode: 'move',
                      startX: e.clientX,
                      startY: e.clientY,
                      initial: { x: el.x, y: el.y }
                    });
                  }
                }}
              >"""
parent_new = """                onMouseDown={(e) => {
                  if (editingId === el.id) return;
                  e.stopPropagation();
                  if (e.button === 0) {
                    setDragState({
                      id: el.id,
                      mode: 'move',
                      startX: e.clientX,
                      startY: e.clientY,
                      initial: { x: el.x, y: el.y }
                    });
                  }
                }}
                onDoubleClick={(e) => {
                  if (el.type === 'text') {
                    e.stopPropagation();
                    setEditingId(el.id);
                  }
                }}
              >"""
if parent_old in content:
    content = content.replace(parent_old, parent_new)
else:
    print("Could not find parent div block")

# 4. Update textarea
textarea_old = """                {el.type === 'text' && (
                  <textarea
                    className="w-full h-full bg-transparent resize-none outline-none p-2 border-0"
                    style={{
                      fontSize: el.style?.fontSize,
                      color: el.style?.color,
                      fontFamily: 'Varela Round, sans-serif'
                    }}
                    value={el.content}
                    onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()} // Allow text selection? No, we want drag usually. Maybe double click to edit?
                  // simple hack: if focused, don't drag.
                  />
                )}"""

textarea_new = """                {el.type === 'text' && (
                  <textarea
                    className={cn(
                      "w-full h-full bg-transparent resize-none outline-none p-2 border-0 transition-colors",
                      editingId === el.id ? "cursor-text select-text pointer-events-auto bg-background/50 backdrop-blur-sm rounded" : "cursor-grab pointer-events-none select-none"
                    )}
                    style={{
                      fontSize: el.style?.fontSize,
                      color: el.style?.color,
                      fontFamily: 'Varela Round, sans-serif'
                    }}
                    value={el.content}
                    onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    readOnly={editingId !== el.id}
                    onBlur={() => setEditingId(null)}
                    ref={(r) => { if (r && editingId === el.id) r.focus(); }}
                  />
                )}"""

if textarea_old in content:
    content = content.replace(textarea_old, textarea_new)
else:
    print("Could not find textarea block")

with open(path, 'w') as f:
    f.write(content)
print("Updated moodboard.tsx")
