import React, { useState, useEffect } from 'react';
import type { StoreCampaign } from '../../../../../server/services/storeService';

interface CampanhasTabProps {
  tenantId: string;
  campaigns: StoreCampaign[];
  onRefresh: () => void;
  onToast: (props: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export function CampanhasTab({ tenantId, campaigns, onRefresh, onToast }: CampanhasTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<StoreCampaign> | null>(null);
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

  function openModal(campaign?: StoreCampaign) {
    setEditing(campaign || {
      name: '',
      description: '',
      badge_text: '',
      image_url: '',
      video_url: '',
      media_type: 'image',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      discount_percentage: 0,
      target_tag: '',
      is_active: true
    });
    setShowModal(true);
  }

  async function save() {
    if (!editing) return;

    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id
        ? `/api/store/campaigns/${editing.id}`
        : '/api/store/campaigns';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(editing)
      });

      if (response.ok) {
        onToast({ title: 'Sucesso', description: 'Campanha salva!' });
        setShowModal(false);
        setEditing(null);
        onRefresh();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar campanha:', error);
      onToast({ title: 'Erro', description: 'Erro ao salvar campanha', variant: 'destructive' });
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Deletar esta campanha?')) return;

    try {
      const response = await fetch(`/api/store/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId }
      });

      if (response.ok) {
        onToast({ title: 'Sucesso', description: 'Campanha deletada!' });
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      onToast({ title: 'Erro', description: 'Erro ao deletar campanha', variant: 'destructive' });
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', type === 'image' ? 'campaigns' : 'videos');
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

  function isActiveCampaign(campaign: StoreCampaign): boolean {
    if (!campaign.is_active) return false;
    const now = new Date();
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    return now >= start && now <= end;
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
            Campanhas Sazonais ({campaigns.length})
          </h3>
          <p style={{ fontSize: '12px', color: '#B8B0A0' }}>
            Promoções com período definido (Dia das Mães, Black Friday, etc.)
          </p>
        </div>
        <button onClick={() => openModal()} style={buttonPrimaryStyles}>
          + Nova Campanha
        </button>
      </div>

      {/* Lista de Campanhas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {campaigns.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #C9A84C22' }}>
            <p style={{ color: '#B8B0A0', fontSize: '14px' }}>
              Nenhuma campanha criada. Clique em "+ Nova Campanha" para começar.
            </p>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const isActive = isActiveCampaign(campaign);
            return (
              <div
                key={campaign.id}
                style={{
                  padding: '16px',
                  backgroundColor: '#1A1A1A',
                  borderRadius: '8px',
                  border: `1px solid ${isActive ? '#C9A84C' : '#C9A84C22'}`,
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center'
                }}
              >
                {/* Preview da Imagem */}
                {campaign.image_url && (
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
                      src={campaign.image_url}
                      alt={campaign.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#F5F0E8' }}>
                      {campaign.name}
                    </h4>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#10B981',
                          backgroundColor: '#10B98120',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}
                      >
                        ATIVA
                      </span>
                    )}
                    {campaign.badge_text && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#EF4444',
                          backgroundColor: '#EF444420',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}
                      >
                        {campaign.badge_text}
                      </span>
                    )}
                  </div>

                  {campaign.description && (
                    <p style={{ fontSize: '12px', color: '#B8B0A0', marginBottom: '8px' }}>
                      {campaign.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6B6358' }}>
                    <span>
                      📅 {new Date(campaign.start_date).toLocaleDateString('pt-BR')} - {new Date(campaign.end_date).toLocaleDateString('pt-BR')}
                    </span>
                    {campaign.discount_percentage && campaign.discount_percentage > 0 && (
                      <span style={{ color: '#C9A84C', fontWeight: '600' }}>
                        {campaign.discount_percentage}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openModal(campaign)}
                    style={{ ...buttonSecondaryStyles, padding: '8px 12px' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => campaign.id && deleteCampaign(campaign.id)}
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
            {/* Header do Modal */}
            <div style={{ padding: '24px', borderBottom: '1px solid #222' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}>
                {editing.id ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyles}>Nome da Campanha</label>
                <input
                  type="text"
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ex: Dia das Mães 2025"
                  style={inputStyles}
                />
              </div>

              <div>
                <label style={labelStyles}>Descrição</label>
                <textarea
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Ex: Celebre o amor com nossa coleção especial"
                  rows={3}
                  style={{ ...inputStyles, resize: 'vertical' as const }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyles}>Data de Início</label>
                  <input
                    type="date"
                    value={editing.start_date || ''}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                    style={inputStyles}
                  />
                </div>
                <div>
                  <label style={labelStyles}>Data de Fim</label>
                  <input
                    type="date"
                    value={editing.end_date || ''}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                    style={inputStyles}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyles}>Badge de Urgência (opcional)</label>
                <input
                  type="text"
                  value={editing.badge_text || ''}
                  onChange={(e) => setEditing({ ...editing, badge_text: e.target.value })}
                  placeholder="Ex: Últimos dias!, Oferta por tempo limitado"
                  style={inputStyles}
                />
                <p style={{ fontSize: '11px', color: '#6B6358', marginTop: '4px' }}>
                  Será exibido em destaque na campanha
                </p>
              </div>

              <div>
                <label style={labelStyles}>Desconto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editing.discount_percentage || 0}
                  onChange={(e) => setEditing({ ...editing, discount_percentage: parseInt(e.target.value) })}
                  style={inputStyles}
                />
              </div>

              <div>
                <label style={labelStyles}>Vincular a uma Etiqueta (Produtos)</label>
                <select
                  value={editing.target_tag || ''}
                  onChange={(e) => setEditing({ ...editing, target_tag: e.target.value })}
                  style={inputStyles}
                >
                  <option value="">-- Selecione uma etiqueta (opcional) --</option>
                  {tags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#6B6358', marginTop: '4px' }}>
                  Ao clicar na campanha, o cliente verá apenas produtos com esta etiqueta.
                </p>
              </div>

              <div>
                <label style={labelStyles}>Tipo de Mídia (Hero)</label>
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

              {editing.media_type === 'image' ? (
                <div>
                  <label style={labelStyles}>Imagem da Campanha</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    style={{ ...inputStyles, cursor: 'pointer' }}
                    disabled={uploading}
                  />
                  {editing.image_url && (
                    <div style={{ marginTop: '12px', border: '1px solid #C9A84C22', borderRadius: '6px', overflow: 'hidden' }}>
                      <img src={editing.image_url} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={labelStyles}>Vídeo da Campanha</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    style={{ ...inputStyles, cursor: 'pointer' }}
                    disabled={uploading}
                  />
                  {editing.video_url && (
                    <div style={{ marginTop: '12px', border: '1px solid #C9A84C22', borderRadius: '6px', overflow: 'hidden' }}>
                      <video src={editing.video_url} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} muted controls />
                    </div>
                  )}
                </div>
              )}
              {uploading && <p style={{ fontSize: '12px', color: '#C9A84C' }}>Enviando...</p>}

              <div>
                <label style={{ ...labelStyles, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editing.is_active !== false}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Campanha ativa</span>
                </label>
              </div>
            </div>

            {/* Footer do Modal */}
            <div style={{ padding: '24px', borderTop: '1px solid #222', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={buttonSecondaryStyles}>
                Cancelar
              </button>
              <button onClick={save} style={buttonPrimaryStyles}>
                {editing.id ? 'Atualizar' : 'Criar'} Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
