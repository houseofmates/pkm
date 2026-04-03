import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook for global keyboard shortcuts
 * Usage: useKeyboardShortcuts([
 *   { key: 'j', ctrl: true, action: () => navigate('/journal'), description: 'Go to journal' }
 * ])
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if user is typing in input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const cmdMatch = shortcut.cmd ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && cmdMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Default keyboard shortcuts for the app
 */
export function useAppKeyboardShortcuts() {
  useKeyboardShortcuts([
    {
      key: 'j',
      ctrl: true,
      action: () => {
        window.location.href = '/journal';
        toast.info('journal opened', { duration: 1500 });
      },
      description: 'go to journal',
    },
    {
      key: 'd',
      ctrl: true,
      action: () => {
        window.location.href = '/';
        toast.info('dashboard opened', { duration: 1500 });
      },
      description: 'go to dashboard',
    },
  ]);
}

/**
 * Keyboard shortcuts for journal page
 */
export function useJournalKeyboardShortcuts({
  onSave,
  onClose,
}: {
  onSave?: () => void;
  onClose?: () => void;
}) {
  useKeyboardShortcuts([
    {
      key: 'enter',
      ctrl: true,
      action: () => {
        onSave?.();
      },
      description: 'save entry',
    },
    {
      key: 'Escape',
      action: () => {
        onClose?.();
      },
      description: 'close modal',
    },
  ]);
}

/**
 * Show keyboard shortcuts help
 */
export function showKeyboardShortcutsHelp() {
  const shortcuts = [
    { combo: 'ctrl + j', desc: 'go to journal' },
    { combo: 'ctrl + d', desc: 'go to dashboard' },
    { combo: 'ctrl + enter', desc: 'save entry (in journal)' },
    { combo: 'esc', desc: 'close modal' },
  ];

  toast(
    <div className="space-y-2">
      <p className="font-medium lowercase">keyboard shortcuts</p>
      <div className="space-y-1">
        {shortcuts.map((s) => (
          <div key={s.combo} className="flex items-center justify-between gap-4 text-sm">
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs">{s.combo}</kbd>
            <span className="text-white/60 lowercase">{s.desc}</span>
          </div>
        ))}
      </div>
    </div>,
    { duration: 5000 }
  );
}
