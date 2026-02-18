
import { Editor } from '@tiptap/core';

export type TiptapRange = { from: number; to: number };
import { useEdgelessStore } from '@/features/edgeless/store';
import { toast } from 'sonner';

// helper to get current fronter from localstorage (to avoid context dependency injection hell in tiptap extensions)
const getActiveFronter = (): string | null => {
  try {
  const stored = localStorage.getItem('pkm_active_fronters');
  const list = stored ? JSON.parse(stored) : [];
  if (list.length > 0) return list[0]; // Just grab the first one
  return null;
  } catch {
  return null;
  }
};

export const CommandActions = {
  insertTodo: (editor: Editor, range: TiptapRange) => {
  editor.chain().focus().deleteRange(range).toggleTaskList().run();
  },

  insertFront: (editor: Editor, range: TiptapRange) => {
  const fronter = getActiveFronter();
  if (fronter) {
  editor.chain().focus().deleteRange(range).insertContent(`**[Front: ${fronter}]** `).run();
  } else {
  toast.error("no active fronter found.");
  }
  },

  sendToCanvas: (editor: Editor, range: TiptapRange) => {
  let content = "New Thought";

  try {
  // range.from is where the slash command started.
  // we generally want to grab the text of the block containing the slash command
  const node = editor.state.doc.nodeAt(range.from);
  if (node && node.isTextblock) {
 content = node.textContent;
  } else {
 // fallback to selection
 const slice = editor.state.doc.slice(range.from - 50, range.from); // Grab some context
 content = slice.content.textBetween(0, slice.content.size) || "New Thought";
  }
  } catch (e) {
  console.warn("Could not extract text for canvas", e);
  }

  const store = useEdgelessStore.getState();
  const viewport = store.viewPort;

  store.addElement({
  type: 'note',
  x: -viewport.x + (window.innerWidth / 2) - 150, // Center roughly
  y: -viewport.y + (window.innerHeight / 2) - 100,
  width: 300,
  height: 200,
  data: { content: `<p>${content}</p>` }, // HTML content for the card
  layerId: store.activeLayerId
  });

  toast.success("sent to canvas");
  editor.chain().focus().deleteRange(range).run(); // Clear the command
  },

  triggerImageUpload: (editor: Editor, range: TiptapRange) => {
  // create a hidden file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const src = event.target?.result as string;
 editor.chain().focus().deleteRange(range).setImage({ src }).run();
 };
 reader.readAsDataURL(file);
  }
  };
  input.click();
  }
};
