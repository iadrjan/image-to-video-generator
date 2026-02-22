'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, Trash2, Play, Clock, Star } from 'lucide-react';
import { HistoryItem } from '@/lib/types';

interface FavoritesProps {
  favorites: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemoveFavorite: (id: string) => void;
}

export function Favorites({ favorites, onSelect, onRemoveFavorite }: FavoritesProps) {
  if (favorites.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <Heart className="w-12 h-12 text-muted-foreground/50" />
          <h3 className="text-sm font-medium">No Favorites Yet</h3>
          <p className="text-xs text-muted-foreground">
            Click the heart icon on any video to add it to favorites
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          Favorites ({favorites.length})
        </h3>
      </div>

      <ScrollArea className="h-[400px] rounded-lg border border-border">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
          {favorites.map((item) => (
            <Card
              key={item.id}
              className="group relative overflow-hidden cursor-pointer transition-all hover:shadow-md"
              onClick={() => onSelect(item)}
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
                  <div className="absolute top-1 left-1">
                    <Heart className="w-4 h-4 text-red-500 fill-current" />
                  </div>

                  {/* Remove from favorites */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFavorite(item.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {item.prompt || 'No prompt'}
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
