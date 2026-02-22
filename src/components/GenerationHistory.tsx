'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { History, Trash2, Heart, Clock, Play } from 'lucide-react';
import { HistoryItem } from '@/lib/types';

interface GenerationHistoryProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onToggleFavorite: (id: string) => void;
}

export function GenerationHistory({
  history,
  onSelect,
  onDelete,
  onClearAll,
  onToggleFavorite,
}: GenerationHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <History className="w-12 h-12 text-muted-foreground/50" />
          <h3 className="text-sm font-medium">No History Yet</h3>
          <p className="text-xs text-muted-foreground">
            Your generated videos will appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <History className="w-4 h-4" />
          Generation History ({history.length})
        </h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All History?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your generation history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ScrollArea className="h-[400px] rounded-lg border border-border">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
          {history.map((item) => (
            <Card
              key={item.id}
              className={`group relative overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                selectedId === item.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                setSelectedId(item.id);
                onSelect(item);
              }}
            >
              <CardContent className="p-0">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  {item.thumbnail || item.imageUrl ? (
                    <img
                      src={item.thumbnail || item.imageUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white" fill="white" />
                  </div>

                  {/* Favorite badge */}
                  {item.isFavorite && (
                    <div className="absolute top-1 left-1">
                      <Heart className="w-4 h-4 text-red-500 fill-current" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                    >
                      <Heart
                        className={`w-3 h-3 ${item.isFavorite ? 'text-red-500 fill-current' : ''}`}
                      />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {item.prompt?.trim() || 'Default settings'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
