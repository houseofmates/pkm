const fs = require('fs');
const path = 'src/features/houseofmates-builder/components/FormRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Identify the block to replace
const oldBlockStart = "{field.type === 'dropdown' && (";
const oldBlockEnd = ")}";

// Since there might be multiple field.type === 'dropdown' checks, we need to find the one inside fields.map in FormBuilder
const formBuilderStart = "export function FormBuilder";
const fbContent = content.slice(content.indexOf(formBuilderStart));

// Find the dropdown check inside FormBuilder
const dropdownStartIdx = fbContent.indexOf("{field.type === 'dropdown' && (");
// Find the end of this block. It's a bit tricky with nested braces.
// But looking at the file, it's followed by </div> and then map close.

const replacement = `{field.type === 'dropdown' && (
                                            <div className="mt-2 ml-6 space-y-2">
                                                <label className="text-white/40 text-[10px] uppercase font-black">options (name, color, order)</label>
                                                <div className="space-y-2">
                                                    {(field.options || []).map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newOpts = [...(field.options || [])];
                                                                    newOpts[optIdx] = e.target.value;
                                                                    updateField(field.id, { options: newOpts });
                                                                }}
                                                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs flex-1 focus:outline-none"
                                                            />
                                                            <input
                                                                type="color"
                                                                value={field.optionColors?.[optIdx] || '#ffffff'}
                                                                onChange={(e) => {
                                                                    const newColors = [...(field.optionColors || [])];
                                                                    while (newColors.length < (field.options?.length || 0)) newColors.push('#ffffff');
                                                                    newColors[optIdx] = e.target.value;
                                                                    updateField(field.id, { optionColors: newColors });
                                                                }}
                                                                className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
                                                            />
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        if (optIdx === 0) return;
                                                                        const newOpts = [...(field.options || [])];
                                                                        const newColors = [...(field.optionColors || [])];
                                                                        [newOpts[optIdx-1], newOpts[optIdx]] = [newOpts[optIdx], newOpts[optIdx-1]];
                                                                        if (newColors.length > optIdx) {
                                                                            [newColors[optIdx-1], newColors[optIdx]] = [newColors[optIdx], newColors[optIdx-1]];
                                                                        }
                                                                        updateField(field.id, { options: newOpts, optionColors: newColors });
                                                                    }}
                                                                    className="text-white/30 hover:text-white disabled:opacity-10"
                                                                    disabled={optIdx === 0}
                                                                >
                                                                    ↑
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (optIdx === (field.options?.length || 0) - 1) return;
                                                                        const newOpts = [...(field.options || [])];
                                                                        const newColors = [...(field.optionColors || [])];
                                                                        [newOpts[optIdx+1], newOpts[optIdx]] = [newOpts[optIdx], newOpts[optIdx+1]];
                                                                        if (newColors.length > optIdx + 1) {
                                                                            [newColors[optIdx+1], newColors[optIdx]] = [newColors[optIdx], newColors[optIdx+1]];
                                                                        }
                                                                        updateField(field.id, { options: newOpts, optionColors: newColors });
                                                                    }}
                                                                    className="text-white/30 hover:text-white disabled:opacity-10"
                                                                    disabled={optIdx === (field.options?.length || 0) - 1}
                                                                >
                                                                    ↓
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const newOpts = (field.options || []).filter((_, i) => i !== optIdx);
                                                                    const newColors = (field.optionColors || []).filter((_, i) => i !== optIdx);
                                                                    updateField(field.id, { options: newOpts, optionColors: newColors });
                                                                }}
                                                                className="text-white/30 hover:text-red-400 ml-2"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newOpts = [...(field.options || []), 'new option'];
                                                            const newColors = [...(field.optionColors || []), '#ffffff'];
                                                            updateField(field.id, { options: newOpts, optionColors: newColors });
                                                        }}
                                                        className="w-full py-1.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold uppercase hover:bg-[var(--primary)]/20 border border-[var(--primary)]/20"
                                                    >
                                                        + add option
                                                    </button>
                                                </div>
                                            </div>
                                        )}`;

// Use a more aggressive approach: find the exact old block by looking for unique strings inside it
const searchPattern = /\{field\.type === 'dropdown' && \([\s\S]*?className="text-white\/30 hover:bg-white\/10 font-bold uppercase hover:bg-\[var\(--primary\)\]\/20"[\s\S]*?\)\}/;
// Wait, I don't know the exact classes in the current file.

// Let's just find "{field.type === 'dropdown' && (" and the next "</div>" after some specific tags.

// Re-read the file to get exact content of the old block
const start = fbContent.indexOf("{field.type === 'dropdown' && (");
const end = fbContent.indexOf("                                </div>", start); // This might be too soon

// Actually, I'll just rewrite the whole FormBuilder component. It's safer.
