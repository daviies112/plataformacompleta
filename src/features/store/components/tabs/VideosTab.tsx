import React, { useState } from 'react';
import type { StoreVideo } from '../../../../../server/services/storeService';

interface VideosTabProps {
    tenantId: string;
    videos: StoreVideo[];
    onRefresh: () => void;
    onToast: (props: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export function VideosTab({ tenantId, videos, onRefresh, onToast }: VideosTabProps) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Partial<StoreVideo> | null>(null);
    const [uploading, setUploading] = useState(false);

    async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'videos');
            formData.append('tenant_id', tenantId);

            const response = await fetch('/api/store/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setEditing(prev => prev ? {
                    ...prev,
                    video_url: data.url,
                    video_type: 'url' // Set to URL since it's a direct file
                } : null);
                onToast({ title: 'Sucesso', description: 'Vídeo carregado com sucesso!' });
            } else {
                throw new Error('Erro no upload');
            }
        } catch (error) {
            console.error('Erro ao carregar vídeo:', error);
            onToast({ title: 'Erro', description: 'Falha ao carregar arquivo de vídeo', variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    }

    function openModal(video?: StoreVideo) {
        setEditing(video || {
            title: '',
            description: '',
            video_url: '',
            video_type: 'youtube', // Default
            section_type: 'institucional', // Default
            display_order: videos.length,
            is_active: true,
            autoplay: false
        });
        setShowModal(true);
    }

    async function save() {
        if (!editing) return;

        try {
            const method = editing.id ? 'PUT' : 'POST';
            const url = editing.id
                ? `/api/store/videos/${editing.id}`
                : '/api/store/videos';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify(editing)
            });

            if (response.ok) {
                onToast({ title: 'Sucesso', description: 'Vídeo salvo!' });
                setShowModal(false);
                setEditing(null);
                onRefresh();
            } else {
                throw new Error('Erro ao salvar');
            }
        } catch (error) {
            console.error('Erro ao salvar vídeo:', error);
            onToast({ title: 'Erro', description: 'Erro ao salvar vídeo', variant: 'destructive' });
        }
    }

    async function deleteVideo(id: string) {
        if (!confirm('Deletar este vídeo?')) return;

        try {
            const response = await fetch(`/api/store/videos/${id}`, {
                method: 'DELETE',
                headers: { 'x-tenant-id': tenantId }
            });

            if (response.ok) {
                onToast({ title: 'Sucesso', description: 'Vídeo deletado!' });
                onRefresh();
            }
        } catch (error) {
            console.error('Erro ao deletar vídeo:', error);
            onToast({ title: 'Erro', description: 'Erro ao deletar vídeo', variant: 'destructive' });
        }
    }

    function getEmbedUrl(url: string, type: string) {
        if (!url) return '';

        if (type === 'youtube') {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            const id = (match && match[2].length === 11) ? match[2] : null;
            return id ? `https://www.youtube.com/embed/${id}` : url;
        }

        if (type === 'vimeo') {
            const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:\w+\/)?|album\/(?:\d+\/)?video\/|)(\d+)(?:$|\/|\?)/;
            const match = url.match(regExp);
            const id = (match && match[1]) ? match[1] : null;
            return id ? `https://player.vimeo.com/video/${id}` : url;
        }

        return url;
    }

    const inputStyles = {
        width: '100%',
        backgroundColor: '#1A1A1A',
        border: '1px solid #C9A84C22',
        color: '#F5F0E8',
        padding: '10px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'DM Sans, sans-serif'
    };

    const labelStyles = {
        display: 'block',
        fontSize: '13px',
        fontWeight: '500' as const,
        color: '#F5F0E8',
        marginBottom: '8px'
    };

    const buttonPrimaryStyles = {
        backgroundColor: '#C9A84C',
        color: '#080808',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600' as const,
        cursor: 'pointer' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    };

    const buttonSecondaryStyles = {
        backgroundColor: 'transparent',
        color: '#B8B0A0',
        border: '1px solid #C9A84C33',
        padding: '10px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500' as const,
        cursor: 'pointer' as const
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#F5F0E8', marginBottom: '4px' }}>
                        Vídeos Institucionais ({videos.length})
                    </h3>
                    <p style={{ fontSize: '12px', color: '#B8B0A0' }}>
                        Vídeos para contar a história da marca ou apresentar produtos.
                    </p>
                </div>
                <button onClick={() => openModal()} style={buttonPrimaryStyles}>
                    + Novo Vídeo
                </button>
            </div>

            {/* Lista de Vídeos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {videos.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #C9A84C22' }}>
                        <p style={{ color: '#B8B0A0', fontSize: '14px' }}>
                            Nenhum vídeo adicionado. Clique em "+ Novo Vídeo" para começar.
                        </p>
                    </div>
                ) : (
                    videos.map((video) => (
                        <div
                            key={video.id}
                            style={{
                                padding: '16px',
                                backgroundColor: '#1A1A1A',
                                borderRadius: '8px',
                                border: '1px solid #C9A84C22',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center'
                            }}
                        >
                            {/* Preview do Vídeo (Embed) */}
                            <div
                                style={{
                                    width: '160px',
                                    height: '90px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    backgroundColor: '#000'
                                }}
                            >
                                {video.video_type === 'url' ? (
                                    <video
                                        src={video.video_url}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <iframe
                                        src={getEmbedUrl(video.video_url, video.video_type)}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        title={video.title}
                                    />
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#F5F0E8', marginBottom: '4px' }}>
                                    {video.title}
                                </h4>
                                {video.description && (
                                    <p style={{ fontSize: '12px', color: '#B8B0A0', marginBottom: '4px' }}>
                                        {video.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#6B6358' }}>
                                    <span style={{
                                        backgroundColor: '#C9A84C20',
                                        color: '#C9A84C',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {video.section_type}
                                    </span>
                                    {video.autoplay && (
                                        <span style={{ color: '#10B981' }}>▶️ Autoplay</span>
                                    )}
                                </div>
                            </div>

                            {/* Ações */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => openModal(video)}
                                    style={{ ...buttonSecondaryStyles, padding: '8px 12px' }}
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => video.id && deleteVideo(video.id)}
                                    style={{
                                        ...buttonSecondaryStyles,
                                        padding: '8px 12px',
                                        color: '#EF4444',
                                        borderColor: '#EF444433'
                                    }}
                                >
                                    Deletar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Edição */}
            {showModal && editing && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#111111',
                            borderRadius: '12px',
                            width: '90%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid #C9A84C33'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '24px', borderBottom: '1px solid #222' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}>
                                {editing.id ? 'Editar Vídeo' : 'Novo Vídeo'}
                            </h2>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={labelStyles}>Título</label>
                                <input
                                    type="text"
                                    value={editing.title || ''}
                                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                    placeholder="Ex: Nossa História"
                                    style={inputStyles}
                                />
                            </div>

                            <div>
                                <label style={labelStyles}>Anexar Arquivo de Vídeo (Opcional)</label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoUpload}
                                    style={{ ...inputStyles, cursor: 'pointer' }}
                                    disabled={uploading}
                                />
                                {uploading && <p style={{ fontSize: '12px', color: '#C9A84C', marginTop: '4px' }}>Enviando vídeo... Por favor, aguarde.</p>}
                            </div>

                            <div>
                                <label style={labelStyles}>Ou Link do Vídeo (YouTube/Vimeo)</label>
                                <input
                                    type="text"
                                    value={editing.video_url || ''}
                                    onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                                    placeholder="Ex: https://www.youtube.com/watch?v=..."
                                    style={inputStyles}
                                />
                                <p style={{ fontSize: '11px', color: '#6B6358', marginTop: '4px' }}>
                                    Cole o link do YouTube/Vimeo ou o link direto do arquivo .mp4
                                </p>
                            </div>

                            <div>
                                <label style={labelStyles}>Descrição (opcional)</label>
                                <textarea
                                    value={editing.description || ''}
                                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                    placeholder="Descrição curta sobre o vídeo..."
                                    rows={3}
                                    style={{ ...inputStyles, resize: 'vertical' as const }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyles}>Onde Exibir</label>
                                    <select
                                        value={editing.section_type || 'institucional'}
                                        onChange={(e) => setEditing({ ...editing, section_type: e.target.value as any })}
                                        style={inputStyles}
                                    >
                                        <option value="institucional">Seção Institucional</option>
                                        <option value="hero">Hero (Topo Home)</option>
                                        <option value="produto">Página de Produto</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyles}>Tipo</label>
                                    <select
                                        value={editing.video_type || 'youtube'}
                                        onChange={(e) => setEditing({ ...editing, video_type: e.target.value as any })}
                                        style={inputStyles}
                                    >
                                        <option value="youtube">YouTube</option>
                                        <option value="vimeo">Vimeo</option>
                                        <option value="url">Arquivo MP4 (Link direto)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ ...labelStyles, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editing.autoplay || false}
                                        onChange={(e) => setEditing({ ...editing, autoplay: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span>Autoplay (Tocar automaticamente, sem som)</span>
                                </label>
                            </div>

                            <div>
                                <label style={{ ...labelStyles, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editing.is_active !== false}
                                        onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span>Vídeo Ativo</span>
                                </label>
                            </div>

                        </div>

                        <div style={{ padding: '24px', borderTop: '1px solid #222', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={buttonSecondaryStyles}>
                                Cancelar
                            </button>
                            <button onClick={save} style={buttonPrimaryStyles}>
                                {editing.id ? 'Atualizar' : 'Salvar'} Vídeo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
