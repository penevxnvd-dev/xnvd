import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && metaMatch && shiftMatch && keyMatch) {
          // Prevent default browser behavior
          if (shortcut.ctrlKey || shortcut.metaKey) {
            event.preventDefault();
          }
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, navigate]);
}

// Common shortcuts
export const commonShortcuts = {
  search: (navigate: (path: string) => void) => ({
    key: 'k',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      // Open search dialog
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        metaKey: true,
      });
      window.dispatchEvent(event);
    },
    description: 'Отвори търсене',
  }),
  settings: (navigate: (path: string) => void) => ({
    key: ',',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      // Open settings
      navigate('/settings');
    },
    description: 'Отвори настройки',
  }),
  dashboard: (navigate: (path: string) => void) => ({
    key: 'd',
    ctrlKey: true,
    metaKey: true,
    action: () => {
      navigate('/dashboard');
    },
    description: 'Отиди в табло',
  }),
};

