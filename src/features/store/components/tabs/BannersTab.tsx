import React, { useState } from 'react';
import type { StoreBanner } from '../../../../../server/services/storeService';

interface BannersTabProps {
  tenantId: string;
  banners: StoreBanner[];
  onRefresh: () => void;
  onToast: (props: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export function BannersTab({ tenantId, banners, onRefresh, onToast }: BannersTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<StoreBanner> | null>(null);
  const [uploading, setUploading] = useState(false);

  function openModal(banner?: StoreBanner) {
    setEditing(banner || {
      title: '',
      subtitle: '',
      image_url: '',
      video_url: '',
      media_type: 'image',
      cta_text: '',
      cta_url: '',
      display_order: banners.length,
      is_active: true
    });
    setShowModal(true);
  }

  async function save() {
    if (!editing) return;

    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id
        ? `/api/store/banners/${editing.id}`
        : '/api/store/banners';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(editing)
      });

      if (response.ok) {
        onToast({ title: 'Sucesso', description: 'Banner salvo!' });
        setShowModal(false);
        setEditing(null);
        onRefresh();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      onToast({ title: 'Erro', description: 'Erro ao salvar banner', variant: 'destructive' });
    }
  }

  async function deleteBanner(id: string) {
    if (!confirm('Deletar este banner?')) return;

    try {
      const response = await fetch(`/api/store/banners/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId }
      });

      if (response.ok) {
        onToast({ title: 'Sucesso', description: 'Banner deletado!' });
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao deletar banner:', error);
      onToast({ title: 'Erro', description: 'Erro ao deletar banner', variant: 'destructive' });
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', type === 'image' ? 'banners' : 'videos');
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
        onToast({ title: 'Sucesso', description: 'Arquivo enviado com sucesso!' });
      } else {
        throw new Error('Erro no upload');
      }
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      onToast({ title: 'Erro', description: 'Falha ao enviar arquivo', variant: 'destructive' });
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
            Banners Hero ({banners.length})
          </h3>
          <p style={{ fontSize: '12px', color: '#B8B0A0' }}>
            Banners rotativos exibidos no topo da loja
          </p>
        </div>
        <button onClick={() => openModal()} style={buttonPrimaryStyles}>
          + Novo Banner
        </button>
      </div>

      {/* Lista de Banners */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {banners.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #C9A84C22' }}>
            <p style={{ color: '#B8B0A0', fontSize: '14px' }}>
              Nenhum banner criado. Clique em "+ Novo Banner" para começar.
            </p>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
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
              {/* Preview da Imagem */}
              {banner.image_url && (
                <div
                  style={{
                    width: '120px',
                    height: '68px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#0A0A0A'
                  }}
                >
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#F5F0E8', marginBottom: '4px' }}>
                  {banner.title || 'Sem título'}
                </h4>
                {banner.subtitle && (
                  <p style={{ fontSize: '12px', color: '#B8B0A0', marginBottom: '8px' }}>
                    {banner.subtitle}
                  </p>
                )}
                {banner.cta_text && (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      color: '#C9A84C',
                      backgroundColor: '#C9A84C20',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    CTA: {banner.cta_text}
                  </span>
                )}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => openModal(banner)}
                  style={{ ...buttonSecondaryStyles, padding: '8px 12px' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => banner.id && deleteBanner(banner.id)}
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
            {/* Header do Modal */}
            <div style={{ padding: '24px', borderBottom: '1px solid #222' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}>
                {editing.id ? 'Editar Banner' : 'Novo Banner'}
              </h2>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyles}>Título</label>
                <input
                  type="text"
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ex: Coleção de Verão"
                  style={inputStyles}
                />
              </div>

              <div>
                <label style={labelStyles}>Subtítulo</label>
                <input
                  type="text"
                  value={editing.subtitle || ''}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  placeholder="Ex: Descubra peças exclusivas"
                  style={inputStyles}
                />
              </div>

              <div>
                <label style={labelStyles}>Tipo de Mídia</label>
                <div style={{ display: 'flex', gap: '12px' }}>
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

              {editing.media_type === 'image' ? (
                <div>
                  <label style={labelStyles}>Imagem Desktop</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    style={{ ...inputStyles, cursor: 'pointer' }}
                    disabled={uploading}
                  />
                  {editing.image_url && (
                    <div style={{ marginTop: '12px', border: '1px solid #C9A84C22', borderRadius: '6px', overflow: 'hidden' }}>
                      <img
                        src={editing.image_url}
                        alt="Preview"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={labelStyles}>Arquivo de Vídeo</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    style={{ ...inputStyles, cursor: 'pointer' }}
                    disabled={uploading}
                  />
                  {editing.video_url && (
                    <div style={{ marginTop: '12px', border: '1px solid #C9A84C22', borderRadius: '6px', overflow: 'hidden' }}>
                      <video
                        src={editing.video_url}
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                        controls
                      />
                    </div>
                  )}
                </div>
              )}
              {uploading && <p style={{ fontSize: '12px', color: '#C9A84C' }}>Enviando arquivo...</p>}

              <div>
                <label style={labelStyles}>Texto do CTA (Call-to-Action)</label>
                <input
                  type="text"
                  value={editing.cta_text || ''}
                  onChange={(e) => setEditing({ ...editing, cta_text: e.target.value })}
                  placeholder="Ex: Ver Coleção"
                  style={inputStyles}
                />
              </div>

              <div>
                <label style={labelStyles}>Link do CTA</label>
                <input
                  type="url"
                  value={editing.cta_url || ''}
                  onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })}
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
                  <span>Banner ativo (visível na loja)</span>
                </label>
              </div>
            </div>

            {/* Footer do Modal */}
            <div style={{ padding: '24px', borderTop: '1px solid #222', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={buttonSecondaryStyles}>
                Cancelar
              </button>
              <button onClick={save} style={buttonPrimaryStyles}>
                {editing.id ? 'Atualizar' : 'Criar'} Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
