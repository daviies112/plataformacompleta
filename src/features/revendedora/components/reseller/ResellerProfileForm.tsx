import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Loader2, User, Phone, Instagram, FileText, Award } from 'lucide-react';
import { useResellerProfile } from '@/hooks/useResellerProfile';
import { toast } from 'sonner';

export function ResellerProfileForm() {
  const { profile, loading, saving, uploading, saveProfile, uploadProfilePhoto } = useResellerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    profile_photo_url: '',
    phone: '',
    instagram_handle: '',
    bio: '',
    show_career_level: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        profile_photo_url: profile.profile_photo_url || '',
        phone: profile.phone || '',
        instagram_handle: profile.instagram_handle || '',
        bio: profile.bio || '',
        show_career_level: profile.show_career_level ?? false,
      });
    }
  }, [profile]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    const url = await uploadProfilePhoto(file);
    if (url) {
      setFormData(prev => ({ ...prev, profile_photo_url: url }));
      toast.success('Foto carregada com sucesso!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(formData);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleInstagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.startsWith('@')) {
      value = value.substring(1);
    }
    value = value.replace(/[^a-zA-Z0-9._]/g, '');
    setFormData(prev => ({ ...prev, instagram_handle: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando perfil...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Meu Perfil
        </CardTitle>
        <CardDescription>
          Personalize sua loja com suas informações de contato e foto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={formData.profile_photo_url} alt="Foto do perfil" />
                <AvatarFallback className="text-3xl bg-primary/10">
                  <User className="h-12 w-12 text-primary" />
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handlePhotoClick}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Clique na foto para alterar (máx. 5MB)
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Celular / WhatsApp
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={16}
              />
              <p className="text-xs text-muted-foreground">
                Este número será exibido na sua loja para contato via WhatsApp
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="instagram"
                  type="text"
                  placeholder="seu_perfil"
                  value={formData.instagram_handle}
                  onChange={handleInstagramChange}
                  className="pl-8"
                  maxLength={30}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Seu perfil do Instagram será exibido na sua loja
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sobre mim (Bio)
              </Label>
              <Textarea
                id="bio"
                placeholder="Conte um pouco sobre você e seu trabalho como revendedora..."
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/500 caracteres
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="show_career_level" className="text-base font-medium cursor-pointer">
                    Exibir nível de carreira
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar sua faixa de vendas na loja pública
                  </p>
                </div>
              </div>
              <Switch
                id="show_career_level"
                checked={formData.show_career_level}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_career_level: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Perfil
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
