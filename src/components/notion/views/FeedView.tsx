import type { Database } from '@/types/notion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface FeedViewProps {
  database: Database;
  onDeleteRow: (rowId: string) => void;
  isLocked: boolean;
}

export const FeedView = ({ database, onDeleteRow, isLocked }: FeedViewProps) => {
  const titleField = database.fields.find(f => f.type === 'text') || database.fields[0];
  const dateField = database.fields.find(f => f.type === 'date');
  const imageField = database.fields.find(f => f.type === 'url');
  const authorField = database.fields.find(f => f.name.toLowerCase().includes('autor') || f.name.toLowerCase().includes('author'));

  if (!database.rows || database.rows.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>Nenhuma postagem ainda</p>
        <p className="text-sm mt-2">Adicione linhas ao database para criar o feed</p>
      </div>
    );
  }

  const sortedRows = dateField 
    ? [...(database.rows || [])].sort((a, b) => {
        const dateA = a.values[dateField.id] ? new Date(a.values[dateField.id]).getTime() : 0;
        const dateB = b.values[dateField.id] ? new Date(b.values[dateField.id]).getTime() : 0;
        return dateB - dateA;
      })
    : (database.rows || []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {sortedRows.map(row => {
        const title = row.values[titleField?.id] || 'Sem título';
        const date = dateField && row.values[dateField.id] 
          ? new Date(row.values[dateField.id])
          : new Date();
        const imageUrl = imageField ? row.values[imageField.id] : null;
        const author = authorField ? row.values[authorField.id] : 'Anônimo';

        return (
          <div key={row.id} className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback>{author.toString().charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{author}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-3">
                <p className="text-sm whitespace-pre-wrap">{title}</p>
              </div>

              {imageUrl && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt="Post" 
                    className="w-full h-auto max-h-96 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="text-xs">Curtir</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">Comentar</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  <span className="text-xs">Compartilhar</span>
                </Button>
                <div className="flex-1" />
                {!isLocked && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDeleteRow(row.id)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="px-4 pb-4">
              {database.fields
                .filter(f => f.id !== titleField?.id && f.id !== dateField?.id && f.id !== imageField?.id && f.id !== authorField?.id)
                .map(field => {
                  const value = row.values[field.id];
                  if (!value) return null;
                  return (
                    <div key={field.id} className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{field.name}:</span> {value.toString()}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
