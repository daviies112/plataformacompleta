import React, { useState } from 'react';
import type { StoreBenefit } from '../../../../../server/services/storeService';

interface BeneficiosTabProps {
  tenantId: string;
  benefits: StoreBenefit[];
  onRefresh: () => void;
  onToast: (props: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

const ICON_OPTIONS = [
  { value: 'gift', label: '🎁 Presente', emoji: '🎁' },
  { value: 'shield', label: '🛡️ Garantia', emoji: '🛡️' },
  { value: 'truck', label: '🚚 Entrega', emoji: '🚚' },
  { value: 'certificate', label: '📜 Certificado', emoji: '📜' },
  { value: 'star', label: '⭐ Qualidade', emoji: '⭐' },
  { value: 'clock', label: '⏰ Atendimento', emoji: '⏰' },
  { value: 'heart', label: '❤️ Cuidado', emoji: '❤️' },
  { value: 'lock', label: '🔒 Segurança', emoji: '🔒' }
];

export function BeneficiosTab({ tenantId, benefits, onRefresh, onToast }: BeneficiosTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<StoreBenefit> | null>(null);

  function openModal(benefit?: StoreBenefit) {
    setEditing(benefit || {
      icon: 'gift',
      title: '',
      description: '',
      display_order: benefits.length,
      is_active: true
    });
    setShowModal(true);
  }

  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;

    try {
      setSaving(true);
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id
        ? `/api/store/benefits/${editing.id}`
        : '/api/store/benefits';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(editing)
      });

      if (response.ok) {
        onToast({ title: 'Sucesso', description: 'Benefício salvo!' });
        setShowModal(false);
        setEditing(null);
        onRefresh();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar benefício:', error);
      onToast({ title: 'Erro', description: 'Erro ao salvar benefício', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteBenefit(id: string) {
    if (!confirm('Deletar este benefício?')) return;

    try {
      const response = await fetch(`/api/store/benefits/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId }
      });

      if (response.ok) {
        onToast({ title: 'Sucesso', description: 'Benefício deletado!' });
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao deletar benefício:', error);
      onToast({ title: 'Erro', description: 'Erro ao deletar benefício', variant: 'destructive' });
    }
  }

  function getIconEmoji(iconName: string): string {
    const icon = ICON_OPTIONS.find(opt => opt.value === iconName);
    return icon?.emoji || '🎁';
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

  const maxBenefits = 4;
  const canAddMore = benefits.length < maxBenefits;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#F5F0E8', marginBottom: '4px' }}>
            Barra de Benefícios ({benefits.length}/{maxBenefits})
          </h3>
          <p style={{ fontSize: '12px', color: '#B8B0A0' }}>
            Ícones + textos curtos exibidos na barra de confiança (garantia, entrega grátis, etc.)
          </p>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            ...buttonPrimaryStyles,
            opacity: canAddMore ? 1 : 0.5,
            cursor: canAddMore ? 'pointer' : 'not-allowed'
          }}
          disabled={!canAddMore}
        >
          + Novo Benefício {!canAddMore && '(Máximo atingido)'}
        </button>
      </div>

      {/* Lista de Benefícios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {benefits.length === 0 ? (
          <div style={{
            gridColumn: 'span 2',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#1A1A1A',
            borderRadius: '8px',
            border: '1px solid #C9A84C22'
          }}>
            <p style={{ color: '#B8B0A0', fontSize: '14px' }}>
              Nenhum benefício criado. Clique em "+ Novo Benefício" para começar.
            </p>
          </div>
        ) : (
          benefits.map((benefit) => (
            <div
              key={benefit.id}
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
              {/* Ícone */}
              <div
                style={{
                  fontSize: '40px',
                  flexShrink: 0,
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#C9A84C15',
                  borderRadius: '8px'
                }}
              >
                {getIconEmoji(benefit.icon)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#F5F0E8', marginBottom: '4px' }}>
                  {benefit.title}
                </h4>
                {benefit.description && (
                  <p style={{ fontSize: '12px', color: '#B8B0A0', lineHeight: '1.4' }}>
                    {benefit.description}
                  </p>
                )}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => openModal(benefit)}
                  style={{
                    ...buttonSecondaryStyles,
                    padding: '6px 12px',
                    fontSize: '11px'
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => benefit.id && deleteBenefit(benefit.id)}
                  style={{
                    ...buttonSecondaryStyles,
                    padding: '6px 12px',
                    fontSize: '11px',
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
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid #C9A84C33'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div style={{ padding: '24px', borderBottom: '1px solid #222' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}>
                {editing.id ? 'Editar Benefício' : 'Novo Benefício'}
              </h2>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyles}>Ícone</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px'
                }}>
                  {ICON_OPTIONS.map((iconOpt) => (
                    <button
                      key={iconOpt.value}
                      type="button"
                      onClick={() => setEditing({ ...editing, icon: iconOpt.value })}
                      style={{
                        padding: '12px',
                        backgroundColor: editing.icon === iconOpt.value ? '#C9A84C20' : '#1A1A1A',
                        border: editing.icon === iconOpt.value ? '2px solid #C9A84C' : '1px solid #C9A84C22',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      {iconOpt.emoji}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#6B6358', marginTop: '8px' }}>
                  Selecione o ícone que melhor representa o benefício
                </p>
              </div>

              <div>
                <label style={labelStyles}>Título do Benefício</label>
                <input
                  type="text"
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ex: Garantia de 1 ano"
                  maxLength={50}
                  style={inputStyles}
                />
                <p style={{ fontSize: '11px', color: '#6B6358', marginTop: '4px' }}>
                  Texto principal (máximo 50 caracteres)
                </p>
              </div>

              <div>
                <label style={labelStyles}>Descrição (opcional)</label>
                <textarea
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Ex: Produtos com garantia contra defeitos de fabricação"
                  rows={3}
                  maxLength={150}
                  style={{ ...inputStyles, resize: 'vertical' as const }}
                />
                <p style={{ fontSize: '11px', color: '#6B6358', marginTop: '4px' }}>
                  Texto complementar exibido abaixo do título (máximo 150 caracteres)
                </p>
              </div>

              <div>
                <label style={{ ...labelStyles, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editing.is_active !== false}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Benefício ativo (visível na loja)</span>
                </label>
              </div>
            </div>

            {/* Footer do Modal */}
            <div style={{ padding: '24px', borderTop: '1px solid #222', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={buttonSecondaryStyles}>
                Cancelar
              </button>
              <button onClick={save} style={{ ...buttonPrimaryStyles, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }} disabled={saving}>
                {saving ? 'Salvando...' : (editing.id ? 'Atualizar' : 'Criar') + ' Benefício'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
