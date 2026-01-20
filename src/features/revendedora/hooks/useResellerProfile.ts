import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';
import { toast } from 'sonner';

export interface ResellerProfile {
  id?: string;
  reseller_id: string;
  profile_photo_url: string | null;
  phone: string | null;
  instagram_handle: string | null;
  bio: string | null;
  show_career_level: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useResellerProfile(resellerId?: string) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [profile, setProfile] = useState<ResellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const getResellerId = useCallback((): string | null => {
    if (resellerId) return resellerId;
    const storedReseller = getStoredResellerId();
    if (storedReseller) return storedReseller;
    console.error('[ResellerProfile] Reseller ID não encontrado no localStorage');
    return null;
  }, [resellerId]);

  const loadProfile = useCallback(async () => {
    if (!supabase) {
      console.log('[ResellerProfile] Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      const id = getResellerId();
      if (!id) {
        console.error('[ResellerProfile] Cannot load profile: reseller_id is missing');
        setLoading(false);
        return;
      }
      console.log('[ResellerProfile] Loading profile for reseller:', id);

      const { data, error } = await supabase
        .from('reseller_profiles')
        .select('*')
        .eq('reseller_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          console.log('[ResellerProfile] Table not found, profile system not set up yet');
        } else {
          console.error('[ResellerProfile] Error loading profile:', error);
        }
      } else if (data) {
        console.log('[ResellerProfile] Profile loaded:', data);
        setProfile(data as ResellerProfile);
      } else {
        console.log('[ResellerProfile] No profile found for reseller');
        setProfile({
          reseller_id: id,
          profile_photo_url: null,
          phone: null,
          instagram_handle: null,
          bio: null,
          show_career_level: false,
        });
      }
    } catch (error) {
      console.error('[ResellerProfile] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, getResellerId]);

  useEffect(() => {
    if (supabaseLoading) return;
    if (!supabase || !configured) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [supabase, supabaseLoading, configured, loadProfile]);

  const uploadProfilePhoto = async (file: File): Promise<string | null> => {
    if (!supabase) {
      toast.error('Configuração do Supabase não encontrada');
      return null;
    }

    setUploading(true);
    try {
      const id = getResellerId();
      if (!id) {
        toast.error('Por favor, faça login novamente');
        setUploading(false);
        return null;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/profile-${Date.now()}.${fileExt}`;
      const filePath = `reseller-profile-photos/${fileName}`;

      console.log('[ResellerProfile] Uploading photo:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reseller-profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          console.log('[ResellerProfile] Storage bucket not found, trying alternative');
          const { data: publicUpload, error: publicError } = await supabase.storage
            .from('public')
            .upload(`reseller-profiles/${fileName}`, file, {
              cacheControl: '3600',
              upsert: true,
            });

          if (publicError) {
            throw publicError;
          }

          const { data: publicUrl } = supabase.storage
            .from('public')
            .getPublicUrl(`reseller-profiles/${fileName}`);

          console.log('[ResellerProfile] Photo uploaded to public bucket:', publicUrl.publicUrl);
          return publicUrl.publicUrl;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('reseller-profile-photos')
        .getPublicUrl(fileName);

      console.log('[ResellerProfile] Photo uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('[ResellerProfile] Upload error:', error);
      toast.error('Erro ao fazer upload da foto: ' + (error.message || 'Erro desconhecido'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (profileData: Partial<ResellerProfile>): Promise<boolean> => {
    if (!supabase) {
      toast.error('Configuração do Supabase não encontrada');
      return false;
    }

    setSaving(true);
    try {
      const id = getResellerId();
      if (!id) {
        toast.error('Por favor, faça login novamente');
        setSaving(false);
        return false;
      }
      const dataToSave = {
        reseller_id: id,
        profile_photo_url: profileData.profile_photo_url || null,
        phone: profileData.phone || null,
        instagram_handle: profileData.instagram_handle || null,
        bio: profileData.bio || null,
        show_career_level: profileData.show_career_level ?? false,
      };

      console.log('[ResellerProfile] Saving profile:', dataToSave);

      const { data: existing } = await supabase
        .from('reseller_profiles')
        .select('id')
        .eq('reseller_id', id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('reseller_profiles')
          .update(dataToSave as any)
          .eq('reseller_id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reseller_profiles')
          .insert(dataToSave as any);

        if (error) throw error;
      }

      console.log('[ResellerProfile] Profile saved successfully');
      setProfile({ ...profile, ...dataToSave } as ResellerProfile);
      toast.success('Perfil salvo com sucesso!');
      return true;
    } catch (error: any) {
      console.error('[ResellerProfile] Save error:', error);
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        toast.error('Tabela de perfis não encontrada. Execute a migração SQL primeiro.');
      } else {
        toast.error('Erro ao salvar perfil: ' + (error.message || 'Erro desconhecido'));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    loading: loading || supabaseLoading,
    saving,
    uploading,
    loadProfile,
    saveProfile,
    uploadProfilePhoto,
    getResellerId,
  };
}

export function usePublicResellerProfile(resellerId: string) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const [profile, setProfile] = useState<ResellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabaseLoading) return;
    if (!supabase || !configured || !resellerId) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        console.log('[PublicResellerProfile] Loading profile for:', resellerId);
        
        const { data, error } = await supabase
          .from('reseller_profiles')
          .select('*')
          .eq('reseller_id', resellerId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[PublicResellerProfile] Error:', error);
        } else if (data) {
          console.log('[PublicResellerProfile] Profile loaded:', data);
          setProfile(data as ResellerProfile);
        }
      } catch (error) {
        console.error('[PublicResellerProfile] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [supabase, supabaseLoading, configured, resellerId]);

  return { profile, loading: loading || supabaseLoading };
}
