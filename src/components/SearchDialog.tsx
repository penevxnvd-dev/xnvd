import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  // Mock search results - in production, this would query the API
  const searchResults = [
    { id: '1', title: 'Реализатори', type: 'section', action: () => navigate('/dashboard') },
    { id: '2', title: 'Сделки', type: 'section', action: () => navigate('/dashboard') },
    { id: '3', title: 'Обучение', type: 'section', action: () => navigate('/training') },
  ].filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Търсене</DialogTitle>
          <DialogDescription>
            Търсете в реализатори, сделки, диагнози и обучение
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput 
            placeholder="Търсене..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>Няма резултати.</CommandEmpty>
            <CommandGroup heading="Резултати">
              {searchResults.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => {
                    result.action();
                    onOpenChange(false);
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {result.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="text-xs text-muted-foreground mt-2">
          Натиснете <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> за затваряне
        </div>
      </DialogContent>
    </Dialog>
  );
}

