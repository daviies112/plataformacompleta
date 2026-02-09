import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';

interface CoverGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCover: (coverUrl: string) => void;
  onSelectGradient: (gradient: string) => void;
  onUploadFile: () => void;
}

const colors = [
  { name: 'Vermelho', color: '#E03E3E' },
  { name: 'Laranja', color: '#F59E0B' },
  { name: 'Azul Claro', color: '#3B82F6' },
  { name: 'Turquesa', color: '#14B8A6' },
  { name: 'Rosa', color: '#EC4899' },
  { name: 'Laranja Escuro', color: '#EA580C' },
  { name: 'Azul', color: '#0EA5E9' },
  { name: 'Roxo', color: '#8B5CF6' },
  { name: 'Roxo Escuro', color: '#6366F1' },
];

const gradients = [
  { name: 'Pôr do Sol', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Oceano', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: 'Floresta', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Aurora', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
  { name: 'Deserto', gradient: 'linear-gradient(135deg, #feb47b 0%, #ff7e5f 100%)' },
  { name: 'Noite', gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
];

const unsplashImages = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800',
  'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800',
  'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800',
  'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800',
  'https://images.unsplash.com/photo-1484589065579-248aad0d8b13?w=800',
  'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=800',
];

const nasaImages = [
  'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=800',
  'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=800',
  'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800',
  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800',
];

export const CoverGalleryDialog = ({
  open,
  onOpenChange,
  onSelectCover,
  onSelectGradient,
  onUploadFile,
}: CoverGalleryDialogProps) => {
  const [urlInput, setUrlInput] = useState('');

  const handleAddFromUrl = () => {
    if (urlInput) {
      onSelectCover(urlInput);
      setUrlInput('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar capa</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="gallery" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gallery">Galeria</TabsTrigger>
            <TabsTrigger value="upload">Carregar</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gallery" className="flex-1 overflow-y-auto space-y-6 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Cor e Gradiente</h3>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((item) => (
                  <button
                    key={item.name}
                    className="aspect-video rounded-md hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all"
                    style={{ backgroundColor: item.color }}
                    onClick={() => {
                      onSelectGradient(item.color);
                      onOpenChange(false);
                    }}
                    title={item.name}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {gradients.map((item) => (
                  <button
                    key={item.name}
                    className="aspect-video rounded-md hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all"
                    style={{ background: item.gradient }}
                    onClick={() => {
                      onSelectGradient(item.gradient);
                      onOpenChange(false);
                    }}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Telescópio James Webb</h3>
              <div className="grid grid-cols-4 gap-2">
                {unsplashImages.slice(0, 4).map((url, index) => (
                  <button
                    key={index}
                    className="aspect-video rounded-md overflow-hidden hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all"
                    onClick={() => {
                      onSelectCover(url);
                      onOpenChange(false);
                    }}
                  >
                    <img src={url} alt={`Webb ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Arquivo da NASA</h3>
              <div className="grid grid-cols-4 gap-2">
                {nasaImages.map((url, index) => (
                  <button
                    key={index}
                    className="aspect-video rounded-md overflow-hidden hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all"
                    onClick={() => {
                      onSelectCover(url);
                      onOpenChange(false);
                    }}
                  >
                    <img src={url} alt={`NASA ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex items-center justify-center py-12">
              <Button 
                onClick={() => {
                  onUploadFile();
                  onOpenChange(false);
                }} 
                size="lg"
                variant="outline"
                className="w-full max-w-sm"
              >
                <Upload className="mr-2 h-5 w-5" />
                Fazer upload de arquivo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL da imagem</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cole o URL da imagem..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddFromUrl();
                    }}
                  />
                  <Button onClick={handleAddFromUrl}>Adicionar</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="unsplash" className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 pt-4">
              {unsplashImages.map((url, index) => (
                <button
                  key={index}
                  className="aspect-video rounded-md overflow-hidden hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all"
                  onClick={() => {
                    onSelectCover(url);
                    onOpenChange(false);
                  }}
                >
                  <img src={url} alt={`Unsplash ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
