import React, { useState, useEffect } from 'react';
import type { StoreMosaic } from '../../../../../server/services/storeService';

interface MosaicoTabProps {
    tenantId: string;
    mosaics: StoreMosaic[];
    onRefresh: () => void;
    onToast: (props: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export function MosaicoTab({ tenantId, mosaics, onRefresh, onToast }: MosaicoTabProps) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Partial<StoreMosaic> | null>(null);
    const [uploading, setUploading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        fetchTags();
    }, [tenantId]);

    async function fetchTags() {
        try {
            const res = await fetch(`/api/store/tags?tenantId=${tenantId}`);
            if (res.ok) {
                setTags(await res.json());
            }
        } catch (error) {
            console.error('Erro ao buscar tags:', error);
        }
    }

    function openModal(mosaic?: StoreMosaic) {
        setEditing(mosaic || {
            title: '',
            image_url: '',
            video_url: '',
            media_type: 'image',
            link_url: '',
            target_tag: '',
            layout_type: '1x1', // Default tile size
            display_order: mosaics.length,
            is_active: true
        });
        setShowModal(true);
    }

    async function save() {
        if (!editing) return;

        try {
            const method = editing.id ? 'PUT' : 'POST';
            const url = editing.id
                ? `/api/store/mosaics/${editing.id}`
                : '/api/store/mosaics';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify(editing)
            });

            if (response.ok) {
                onToast({ title: 'Sucesso', description: 'Mosaico salvo!' });
                setShowModal(false);
                setEditing(null);
                onRefresh();
            } else {
                throw new Error('Erro ao salvar');
            }
        } catch (error) {
            console.error('Erro ao salvar mosaico:', error);
            onToast({ title: 'Erro', description: 'Erro ao salvar mosaico', variant: 'destructive' });
        }
    }

    async function deleteMosaic(id: string) {
        if (!confirm('Deletar este item do mosaico?')) return;

        try {
            const response = await fetch(`/api/store/mosaics/${id}`, {
                method: 'DELETE',
                headers: { 'x-tenant-id': tenantId }
            });

            if (response.ok) {
                onToast({ title: 'Sucesso', description: 'Item deletado!' });
                onRefresh();
            }
        } catch (error) {
            console.error('Erro ao deletar item:', error);
            onToast({ title: 'Erro', description: 'Erro ao deletar item', variant: 'destructive' });
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', type === 'image' ? 'mosaics' : 'videos');
            formData.append('tenant_id', tenantId);

            const response = await fetch('/api/store/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                if (type === 'image') {
                    setEditing(prev => prev ? { ...prev, image_url: data.url, media_type: 'image' } : null);
                } else {
                    setEditing(prev => prev ? { ...prev, video_url: data.url, media_type: 'video' } : null);
                }
                onToast({ title: 'Sucesso', description: 'Arquivo enviado!' });
            } else {
                throw new Error('Erro no upload');
            }
        } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            onToast({ title: 'Erro', description: 'Falha ao enviar', variant: 'destructive' });
        } finally {
            setUploading(false);
        }
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
                        Mosaico de Banners ({mosaics.length})
                    </h3>
                    <p style={{ fontSize: '12px', color: '#B8B0A0' }}>
                        Crie um grid visual estilo Instagram para destacar coleções.
                    </p>
                </div>
                <button onClick={() => openModal()} style={buttonPrimaryStyles}>
                    + Novo Tile
                </button>
            </div>

            {/* Grid Visualização */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: '150px',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#0A0A0A',
                border: '1px solid #C9A84C22',
                borderRadius: '8px'
            }}>
                {mosaics.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                        <p style={{ color: '#B8B0A0', fontSize: '14px' }}>
                            Nenhum item no mosaico. Adicione imagens para criar seu grid.
                        </p>
                    </div>
                ) : (
                    mosaics.map((mosaic) => {
                        const colSpan = mosaic.layout_type === '2x1' || mosaic.layout_type === '2x2' ? 'span 2' : 'span 1';
                        const rowSpan = mosaic.layout_type === '1x2' || mosaic.layout_type === '2x2' ? 'span 2' : 'span 1';

                        return (
                            <div
                                key={mosaic.id}
                                style={{
                                    gridColumn: colSpan,
                                    gridRow: rowSpan,
                                    position: 'relative',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: '1px solid #333',
                                    backgroundImage: `url(${mosaic.image_url})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    cursor: 'pointer'
                                }}
                                className="group"
                            >
                                {/* Overlay on Hover (simulated with constant visible controls for edit) */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: 0,
                                    transition: 'opacity 0.2s'
                                }}
                                    className="opacity-0 group-hover:opacity-100"
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal(mosaic); }}
                                        style={{ ...buttonPrimaryStyles, fontSize: '11px', padding: '6px 12px' }}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); mosaic.id && deleteMosaic(mosaic.id); }}
                                        style={{ ...buttonSecondaryStyles, fontSize: '11px', padding: '6px 12px', backgroundColor: '#000', color: '#FFF' }}
                                    >
                                        Deletar
                                    </button>
                                </div>

                                {mosaic.title && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '10px',
                                        left: '10px',
                                        color: '#FFF',
                                        fontWeight: '600',
                                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                    }}>
                                        {mosaic.title}
                                    </div>
                                )}
                            </div>
                        );
                    })
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
                                {editing.id ? 'Editar Tile' : 'Novo Tile'}
                            </h2>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            <div>
                                <label style={labelStyles}>Tipo de Mídia</label>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    <button
                                        onClick={() => setEditing(prev => prev ? { ...prev, media_type: 'image' } : null)}
                                        style={{
                                            ...buttonSecondaryStyles,
                                            flex: 1,
                                            backgroundColor: editing.media_type === 'image' ? '#C9A84C20' : 'transparent',
                                            borderColor: editing.media_type === 'image' ? '#C9A84C' : '#C9A84C33',
                                            color: editing.media_type === 'image' ? '#C9A84C' : '#B8B0A0'
                                        }}
                                    >
                                        Imagem
                                    </button>
                                    <button
                                        onClick={() => setEditing(prev => prev ? { ...prev, media_type: 'video' } : null)}
                                        style={{
                                            ...buttonSecondaryStyles,
                                            flex: 1,
                                            backgroundColor: editing.media_type === 'video' ? '#C9A84C20' : 'transparent',
                                            borderColor: editing.media_type === 'video' ? '#C9A84C' : '#C9A84C33',
                                            color: editing.media_type === 'video' ? '#C9A84C' : '#B8B0A0'
                                        }}
                                    >
                                        Vídeo
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    {editing.media_type === 'image' ? (
                                        <>
                                            <label style={labelStyles}>Imagem</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileUpload(e, 'image')}
                                                style={{ ...inputStyles, cursor: 'pointer' }}
                                                disabled={uploading}
                                            />
                                            {editing.image_url && (
                                                <div style={{ marginTop: '12px', height: '100px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <img src={editing.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <label style={labelStyles}>Vídeo</label>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => handleFileUpload(e, 'video')}
                                                style={{ ...inputStyles, cursor: 'pointer' }}
                                                disabled={uploading}
                                            />
                                            {editing.video_url && (
                                                <div style={{ marginTop: '12px', height: '100px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <video src={editing.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {uploading && <p style={{ fontSize: '11px', color: '#C9A84C', marginTop: '4px' }}>Enviando...</p>}
                                </div>

                                <div>
                                    <label style={labelStyles}>Tamanho (Grid)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {['1x1', '1x2', '2x1', '2x2'].map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setEditing({ ...editing, layout_type: size as any })}
                                                style={{
                                                    padding: '10px',
                                                    border: editing.layout_type === size ? '1px solid #C9A84C' : '1px solid #333',
                                                    backgroundColor: editing.layout_type === size ? '#C9A84C20' : 'transparent',
                                                    color: editing.layout_type === size ? '#C9A84C' : '#F5F0E8',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyles}>Título (Sobreposto)</label>
                                <input
                                    type="text"
                                    value={editing.title || ''}
                                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                                    placeholder="Ex: Coleção Verão"
                                    style={inputStyles}
                                />
                            </div>

                            <div>
                                <label style={labelStyles}>Vincular a uma Etiqueta (Produtos)</label>
                                <select
                                    value={editing.target_tag || ''}
                                    onChange={(e) => {
                                        const tag = e.target.value;
                                        setEditing({
                                            ...editing,
                                            target_tag: tag,
                                            // Auto-generate link if empty or previous tag link
                                            link_url: tag ? `?tag=${encodeURIComponent(tag)}` : editing.link_url
                                        });
                                    }}
                                    style={inputStyles}
                                >
                                    <option value="">-- Selecione uma etiqueta (opcional) --</option>
                                    {tags.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyles}>Link de Destino</label>
                                <input
                                    type="text"
                                    value={editing.link_url || ''}
                                    onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                                    placeholder="Ex: /colecao/verao"
                                    style={inputStyles}
                                />
                            </div>

                            <div>
                                <label style={{ ...labelStyles, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editing.is_active !== false}
                                        onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span>Ativo</span>
                                </label>
                            </div>

                        </div>

                        <div style={{ padding: '24px', borderTop: '1px solid #222', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={buttonSecondaryStyles}>
                                Cancelar
                            </button>
                            <button onClick={save} style={buttonPrimaryStyles}>
                                {editing.id ? 'Atualizar' : 'Salvar'} Tile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
