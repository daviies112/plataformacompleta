import { getSupabaseClient } from '../../../lib/supabase';

// Types for the database tables
export interface GratisRequest {
    id: string;
    user_id: string;
    foto_original_url: string;
    foto_melhorada_url: string | null;
    descricao_produto: string | null;
    status: 'pendente' | 'processando' | 'concluido' | 'erro';
    created_at: string;
    erro_mensagem?: string;
}

export interface NinePhotosRequest {
    id: string;
    user_id: string;
    foto_original_url: string;
    // Generated photos
    foto_1_url: string | null; foto_1_descricao: string | null;
    foto_2_url: string | null; foto_2_descricao: string | null;
    foto_3_url: string | null; foto_3_descricao: string | null;
    foto_4_url: string | null; foto_4_descricao: string | null;
    foto_5_url: string | null; foto_5_descricao: string | null;
    foto_6_url: string | null; foto_6_descricao: string | null;
    foto_7_url: string | null; foto_7_descricao: string | null;
    foto_8_url: string | null; foto_8_descricao: string | null;
    foto_9_url: string | null; foto_9_descricao: string | null;

    templates_escolhidos: number[];
    is_gratis: boolean;
    descricao_produto: string | null;
    categoria: string | null;
    status: 'pendente' | 'processando' | 'concluido' | 'erro';
    created_at: string;
    erro_mensagem?: string;
}

const BUCKET_GRATIS = 'fotos_servico_gratis';
const BUCKET_9PACK = 'fotos_servico_9pack';

export const photoService = {

    /**
     * Upload image to Supabase Storage
     */
    async uploadImage(file: File, bucket: string, userId: string): Promise<string> {
        const supabase = await getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    /**
     * Create a request for "Melhorar Foto" (Free Service)
     */
    async createFreeRequest(
        userId: string,
        imageUrl: string,
        description: string
    ): Promise<GratisRequest> {
        const supabase = await getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
            .from('imagens_gratis')
            .insert({
                user_id: userId,
                foto_original_url: imageUrl,
                descricao_produto: description,
                status: 'pendente'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Fetch a specific "Melhorar Foto" request by ID
     */
    async getFreeRequest(id: string): Promise<GratisRequest | null> {
        const supabase = await getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
            .from('imagens_gratis')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Create a request for "9 Fotos" (Paid Service)
     */
    async create9PhotosRequest(
        userId: string,
        imageUrl: string,
        description: string,
        category: string,
        templates: number[],
        isGratis: boolean = false
    ): Promise<NinePhotosRequest> {
        const supabase = await getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
            .from('imagens_9fotos')
            .insert({
                user_id: userId,
                foto_original_url: imageUrl,
                descricao_produto: description,
                categoria: category,
                templates_escolhidos: templates,
                is_gratis: isGratis,
                status: 'pendente'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Fetch a specific "9 Fotos" request by ID
     */
    async get9PhotosRequest(id: string): Promise<NinePhotosRequest | null> {
        const supabase = await getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
            .from('imagens_9fotos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Subscribe to real-time updates for a request
     */
    async subscribeToRequest(
        table: 'imagens_gratis' | 'imagens_9fotos',
        id: string,
        onUpdate: (payload: any) => void
    ) {
        const supabase = await getSupabaseClient();
        if (!supabase) return null;

        return supabase
            .channel(`public:${table}:id=eq.${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: table,
                    filter: `id=eq.${id}`
                },
                (payload: any) => {
                    onUpdate(payload.new);
                }
            )
            .subscribe();
    }
};
