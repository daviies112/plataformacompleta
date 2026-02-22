import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import StorePreview from '../../../components/Store/StorePreview';
import type { StoreSettings, StoreBanner, StoreCampaign, StoreBenefit, StoreMosaic } from '../../../../server/services/storeService';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Loader2 } from "lucide-react";
import { storeApi } from '../../../lib/api';
// TEMPORARIAMENTE COMENTADO PARA DEBUG
import { BannersTab } from '../components/tabs/BannersTab';
import { CampanhasTab } from '../components/tabs/CampanhasTab';
import { BeneficiosTab } from '../components/tabs/BeneficiosTab';
// import { VideosTab } from '../components/tabs/VideosTab';
import { MosaicoTab } from '../components/tabs/MosaicoTab';

// 🚨 DEBUG CRÍTICO - Este log deve aparecer SEMPRE que o arquivo for carregado
console.log('🔥🔥🔥 ARQUIVO PersonalizarLoja.tsx FOI IMPORTADO/CARREGADO! 🔥🔥🔥');

/**
 * PersonalizarLoja - Página do Admin para personalizar a loja de semijoias
 *
 * Permite configurar:
 * - Branding (logo, nome, cores)
 * - Layout (grid, colunas, seções)
 * - Tipografia
 * - Header e Footer
 *
 * Com preview em tempo real usando Design System Nacre
 */
export default function PersonalizarLoja() {
  // 🚨 DEBUG: Se você está vendo isso, o arquivo CORRETO está carregando!
  console.log('🎯🎯🎯 COMPONENTE PersonalizarLoja() ESTÁ SENDO EXECUTADO!!! 🎯🎯🎯');
  console.log('🎯 PersonalizarLoja.tsx CARREGADO - VERSÃO NOVA COM 7 TABS');

  const { tenantId, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<'branding' | 'layout' | 'cores' | 'tipografia' | 'banners' | 'campanhas' | 'beneficios' | 'mosaico'>('branding');

  // Estado para novas funcionalidades
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [campaigns, setCampaigns] = useState<StoreCampaign[]>([]);
  const [benefits, setBenefits] = useState<StoreBenefit[]>([]);
  const [mosaics, setMosaics] = useState<StoreMosaic[]>([]);

  const [settings, setSettings] = useState<Partial<StoreSettings>>({
    store_name: 'Minha Loja',
    store_tagline: 'Elegância em Cada Detalhe',
    color_primary: '#C9A84C',
    color_primary_light: '#E8CC7A',
    color_primary_dim: '#7A6128',
    color_background: '#080808',
    color_surface: '#111111',
    color_text_primary: '#F5F0E8',
    color_text_secondary: '#B8B0A0',
    font_heading: 'Cormorant Garamond',
    font_body: 'DM Sans',
    layout_type: 'grid',
    layout_columns: 3,
    show_banner: true,
    show_categories: true,
    show_search_bar: true,
    show_cart: true,
    show_announcement_bar: false,
    show_benefits_bar: true,
    show_active_campaign: true,
    show_video_section: true,
    show_mosaic_section: true,
    show_featured_products: true
  });

  // Carregar configurações existentes
  useEffect(() => {
    if (authLoading) return;

    if (!tenantId) {
      console.log('❌ PersonalizarLoja: Tenant ID não encontrado após auth check');
      setLoading(false);
      return;
    }

    loadAllData();
  }, [tenantId, authLoading]);

  async function loadAllData() {
    if (!tenantId) return;

    try {
      setLoading(true);

      const [settingsRes, bannersRes, campaignsRes, benefitsRes] = await Promise.all([
        fetch('/api/store/settings', { headers: { 'x-tenant-id': tenantId } }),
        fetch('/api/store/banners', { headers: { 'x-tenant-id': tenantId } }),
        fetch('/api/store/campaigns', { headers: { 'x-tenant-id': tenantId } }),
        fetch('/api/store/benefits', { headers: { 'x-tenant-id': tenantId } })
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }

      if (bannersRes.ok) {
        const data = await bannersRes.json();
        setBanners(data);
      }

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data);
      }

      if (benefitsRes.ok) {
        const data = await benefitsRes.json();
        setBenefits(data);
      }


      // Buscar Mosaicos
      const mosaicsRes = await fetch('/api/store/mosaics', { headers: { 'x-tenant-id': tenantId } });
      if (mosaicsRes.ok) {
        const data = await mosaicsRes.json();
        setMosaics(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function refreshBanners() {
    if (!tenantId) return;
    try {
      const response = await fetch('/api/store/banners', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar banners:', error);
    }
  }

  async function refreshCampaigns() {
    if (!tenantId) return;
    try {
      const response = await fetch('/api/store/campaigns', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar campanhas:', error);
    }
  }

  async function refreshBenefits() {
    if (!tenantId) return;
    try {
      const response = await fetch('/api/store/benefits', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setBenefits(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar benefícios:', error);
    }
  }


  async function refreshMosaics() {
    if (!tenantId) return;
    try {
      const response = await fetch('/api/store/mosaics', { headers: { 'x-tenant-id': tenantId } });
      if (response.ok) {
        const data = await response.json();
        setMosaics(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar mosaicos:', error);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      const response = await fetch('/api/store/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || ''
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso!' });
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar configurações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: keyof StoreSettings, value: any) {
    console.log(`[PersonalizarLoja] updateSetting: ${key} =`, value);
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      console.log('[PersonalizarLoja] New Settings State:', newSettings);
      return newSettings;
    });
  }

  if (loading) {
    console.log('⏳ PersonalizarLoja: LOADING STATE');
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Carregando configurações...</div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#F5F0E8' }}>
        <div>Erro: Não foi possível identificar a loja (Tenant ID ausente).</div>
        <div style={{ marginTop: '12px', fontSize: '14px', color: '#B8B0A0' }}>Tente fazer login novamente.</div>
      </div>
    );
  }

  console.log('✅ PersonalizarLoja: RENDERIZANDO INTERFACE COMPLETA');
  console.log('📊 Settings:', settings);
  console.log('🖼️ Banners:', banners);

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 56px)',
        backgroundColor: '#0A0A0A',
        fontFamily: 'DM Sans, sans-serif'
      }}
    >
      {/* PAINEL DE CONFIGURAÇÃO (Esquerda) */}
      <div
        style={{
          width: showPreview ? '420px' : '100%',
          backgroundColor: '#111111',
          borderRight: '1px solid #222',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header do Painel */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #222'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#F5F0E8',
                  marginBottom: '4px',
                  fontFamily: 'Cormorant Garamond, serif'
                }}
              >
                🎯 Personalizar Loja (NOVA VERSÃO - 7 TABS)
              </h1>
              <p style={{ fontSize: '13px', color: '#B8B0A0' }}>
                Configure o visual da sua loja de semijoias
              </p>
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #C9A84C33',
                color: '#C9A84C',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {showPreview ? 'Esconder' : 'Mostrar'} Preview
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            {[
              { id: 'branding' as const, label: '🎨 Branding' },
              { id: 'cores' as const, label: '🌈 Cores' },
              { id: 'layout' as const, label: '📐 Layout' },
              { id: 'tipografia' as const, label: '🔤 Tipografia' },
              { id: 'banners' as const, label: '🖼️ Banners' },
              { id: 'campanhas' as const, label: '🎉 Campanhas' },
              { id: 'beneficios' as const, label: '✅ Benefícios' },
              { id: 'mosaico' as const, label: '🧩 Mosaico' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  backgroundColor: activeTab === tab.id ? '#C9A84C20' : 'transparent',
                  border: `1px solid ${activeTab === tab.id ? '#C9A84C' : '#C9A84C33'}`,
                  color: activeTab === tab.id ? '#C9A84C' : '#B8B0A0',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo do Painel (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* TAB: BRANDING */}
          {activeTab === 'branding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={settings.store_name || ''}
                  onChange={(e) => updateSetting('store_name', e.target.value)}
                  placeholder="Ex: Joias Elegantes"
                  style={{
                    width: '100%',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #C9A84C22',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Slogan
                </label>
                <input
                  type="text"
                  value={settings.store_tagline || ''}
                  onChange={(e) => updateSetting('store_tagline', e.target.value)}
                  placeholder="Ex: Elegância em Cada Detalhe"
                  style={{
                    width: '100%',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #C9A84C22',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  URL do Logo
                </label>
                <p style={{ fontSize: '12px', color: '#6B6358', marginTop: '4px' }}>
                  Deixe em branco para usar o nome da loja como logo
                </p>

                <div style={{ marginTop: '12px' }}>
                  {settings.logo_url ? (
                    <div className="relative w-full max-w-sm aspect-video rounded-lg border border-[#C9A84C22] bg-[#111] flex items-center justify-center overflow-hidden group">
                      <img
                        src={settings.logo_url}
                        alt="Logo Preview"
                        style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                      >
                        <button
                          onClick={() => updateSetting('logo_url', '')}
                          style={{
                            backgroundColor: '#EF4444',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '120px',
                        border: '2px dashed #C9A84C44',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: '#1A1A1A',
                        transition: 'all 0.2s',
                        color: '#B8B0A0'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#C9A84C11';
                        e.currentTarget.style.borderColor = '#C9A84C';
                        e.currentTarget.style.color = '#C9A84C';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1A1A1A';
                        e.currentTarget.style.borderColor = '#C9A84C44';
                        e.currentTarget.style.color = '#B8B0A0';
                      }}
                    >
                      {uploadingLogo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', items: 'center', gap: '8px' }}>
                          <Loader2 className="animate-spin" size={24} />
                          <span style={{ fontSize: '12px' }}>Enviando...</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={24} style={{ marginBottom: '8px' }} />
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>Clique ou arraste sua logo</span>
                          <span style={{ fontSize: '11px', opacity: 0.7 }}>PNG, JPG ou WEBP</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingLogo}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!file.type.startsWith('image/')) {
                            toast({
                              title: "Erro",
                              description: "Por favor, selecione uma imagem válida",
                              variant: "destructive"
                            });
                            return;
                          }

                          setUploadingLogo(true);
                          try {
                            const logoUrl = await storeApi.uploadLogo(file);
                            updateSetting('logo_url', logoUrl);
                            toast({ title: "Sucesso!", description: "Logo enviada com sucesso" });
                          } catch (error) {
                            console.error('Error uploading logo:', error);
                            toast({
                              title: "Erro",
                              description: "Erro ao fazer upload da logo",
                              variant: "destructive"
                            });
                          } finally {
                            setUploadingLogo(false);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Tamanho do Logo
                </label>
                <select
                  value={settings.logo_size || 'medium'}
                  onChange={(e) => updateSetting('logo_size', e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #C9A84C22',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Texto do Rodapé
                </label>
                <textarea
                  value={settings.footer_text || ''}
                  onChange={(e) => updateSetting('footer_text', e.target.value)}
                  placeholder="Ex: © 2025 Minha Loja. Todos os direitos reservados."
                  rows={3}
                  style={{
                    width: '100%',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #C9A84C22',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB: CORES */}
          {activeTab === 'cores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #C9A84C22',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <p style={{ fontSize: '12px', color: '#B8B0A0', marginBottom: '12px' }}>
                  💡 <strong>Dica:</strong> Use o Design System Nacre (dourado + dark) para um visual premium
                </p>
              </div>

              {[
                { key: 'color_primary' as const, label: 'Cor Primária', default: '#C9A84C' },
                { key: 'color_primary_light' as const, label: 'Cor Primária (Hover)', default: '#E8CC7A' },
                { key: 'color_background' as const, label: 'Fundo Principal', default: '#080808' },
                { key: 'color_surface' as const, label: 'Fundo Cards', default: '#111111' },
                { key: 'color_text_primary' as const, label: 'Texto Principal', default: '#F5F0E8' },
                { key: 'color_text_secondary' as const, label: 'Texto Menu Principal', default: '#B8B0A0' }
              ].map(({ key, label, default: defaultValue }) => (
                <div key={key}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#F5F0E8',
                      marginBottom: '8px'
                    }}
                  >
                    {label}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={settings[key] || defaultValue}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      style={{
                        width: '56px',
                        height: '42px',
                        border: '1px solid #C9A84C22',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={settings[key] || defaultValue}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      placeholder="#000000"
                      style={{
                        flex: 1,
                        backgroundColor: '#1A1A1A',
                        border: '1px solid #C9A84C22',
                        color: '#F5F0E8',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  // Restaurar cores padrão Nacre
                  setSettings({
                    ...settings,
                    color_primary: '#C9A84C',
                    color_primary_light: '#E8CC7A',
                    color_primary_dim: '#7A6128',
                    color_background: '#080808',
                    color_surface: '#111111',
                    color_text_primary: '#F5F0E8',
                    color_text_secondary: '#B8B0A0'
                  });
                  toast({ title: 'Sucesso', description: 'Cores restauradas para o padrão Nacre' });
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #C9A84C66',
                  color: '#C9A84C',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Restaurar Cores Padrão (Nacre)
              </button>
            </div>
          )}

          {/* TAB: LAYOUT */}
          {activeTab === 'layout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>


              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Colunas no Grid: {settings.layout_columns || 3}
                </label>
                <input
                  type="range"
                  min="2"
                  max="4"
                  value={settings.layout_columns || 3}
                  onChange={(e) => updateSetting('layout_columns', parseInt(e.target.value))}
                  style={{
                    width: '100%'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B6358', marginTop: '4px' }}>
                  <span>2 colunas</span>
                  <span>3 colunas</span>
                  <span>4 colunas</span>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #C9A84C22',
                  paddingTop: '20px',
                  marginTop: '12px'
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#F5F0E8', marginBottom: '12px' }}>
                  Seções Visíveis
                </p>

                {[
                  { key: 'show_banner' as const, label: 'Mostrar Banner' },
                  { key: 'show_categories' as const, label: 'Mostrar Categorias' },
                  { key: 'show_featured_products' as const, label: 'Produtos em Destaque' },
                  { key: 'show_search_bar' as const, label: 'Barra de Busca' },
                  { key: 'show_cart' as const, label: 'Carrinho de Compras' },
                  { key: 'show_benefits_bar' as const, label: 'Barra de Benefícios' },
                  { key: 'show_active_campaign' as const, label: 'Campanha Ativa' },
                  { key: 'show_mosaic_section' as const, label: 'Seção de Mosaico' }
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings[key] !== false}
                      onChange={(e) => updateSetting(key, e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#F5F0E8' }}>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ padding: '20px', backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #333' }}>
                <h4 style={{ color: '#F5F0E8', marginBottom: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                  Faixa de Aviso (Announcement Bar)
                </h4>

                <div style={{ display: 'grid', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#F5F0E8', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.show_announcement_bar || false}
                      onChange={(e) => updateSetting('show_announcement_bar', e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Mostrar faixa de aviso no topo do site
                  </label>

                  {settings.show_announcement_bar && (
                    <>
                      <div>
                        <label style={{ display: 'block', color: '#B8B0A0', fontSize: '12px', marginBottom: '4px' }}>
                          Texto do Aviso
                        </label>
                        <input
                          type="text"
                          value={settings.announcement_bar_text || ''}
                          onChange={(e) => updateSetting('announcement_bar_text', e.target.value)}
                          placeholder="Ex: Frete Grátis para todo Brasil"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: '#222',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            color: '#F5F0E8'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#B8B0A0', fontSize: '12px', marginBottom: '4px' }}>
                            Cor de Fundo
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="color"
                              value={settings.announcement_bar_bg_color || '#000000'}
                              onChange={(e) => updateSetting('announcement_bar_bg_color', e.target.value)}
                              style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={settings.announcement_bar_bg_color || '#000000'}
                              onChange={(e) => updateSetting('announcement_bar_bg_color', e.target.value)}
                              style={{ flex: 1, padding: '8px', backgroundColor: '#222', border: '1px solid #333', borderRadius: '4px', color: '#FFF' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#B8B0A0', fontSize: '12px', marginBottom: '4px' }}>
                            Cor do Texto
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="color"
                              value={settings.announcement_bar_text_color || '#FFFFFF'}
                              onChange={(e) => updateSetting('announcement_bar_text_color', e.target.value)}
                              style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={settings.announcement_bar_text_color || '#FFFFFF'}
                              onChange={(e) => updateSetting('announcement_bar_text_color', e.target.value)}
                              style={{ flex: 1, padding: '8px', backgroundColor: '#222', border: '1px solid #333', borderRadius: '4px', color: '#FFF' }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TIPOGRAFIA */}
          {activeTab === 'tipografia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Fonte dos Títulos
                </label>
                <select
                  value={settings.font_heading || 'Cormorant Garamond'}
                  onChange={(e) => updateSetting('font_heading', e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #C9A84C22',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  <option value="Cormorant Garamond">Cormorant Garamond (Recomendado)</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Lora">Lora</option>
                  <option value="Crimson Pro">Crimson Pro</option>
                </select>
                <p style={{ fontSize: '12px', color: '#6B6358', marginTop: '4px' }}>
                  Fonte usada em títulos e headers
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F5F0E8',
                    marginBottom: '8px'
                  }}
                >
                  Fonte do Corpo
                </label>
                <select
                  value={settings.font_body || 'DM Sans'}
                  onChange={(e) => updateSetting('font_body', e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #C9A84C22',
                    color: '#F5F0E8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  <option value="DM Sans">DM Sans (Recomendado)</option>
                  <option value="Inter">Inter</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Poppins">Poppins</option>
                </select>
                <p style={{ fontSize: '12px', color: '#6B6358', marginTop: '4px' }}>
                  Fonte usada em textos e botões
                </p>
              </div>

              <div
                style={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #C9A84C22',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '12px'
                }}
              >
                <p style={{ fontSize: '12px', color: '#B8B0A0', marginBottom: '8px' }}>
                  <strong>Design System Nacre:</strong>
                </p>
                <ul style={{ fontSize: '12px', color: '#6B6358', marginLeft: '16px', lineHeight: '1.6' }}>
                  <li>
                    <strong>Cormorant Garamond:</strong> Elegância editorial
                  </li>
                  <li>
                    <strong>DM Sans:</strong> Limpeza moderna
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB: BANNERS */}
          {activeTab === 'banners' && tenantId && (
            <BannersTab
              tenantId={tenantId}
              banners={banners}
              onRefresh={refreshBanners}
              onToast={toast}
            />
          )}

          {/* TAB: CAMPANHAS */}
          {activeTab === 'campanhas' && tenantId && (
            <CampanhasTab
              tenantId={tenantId}
              campaigns={campaigns}
              onRefresh={refreshCampaigns}
              onToast={toast}
            />
          )}

          {/* TAB: BENEFÍCIOS */}
          {activeTab === 'beneficios' && tenantId && (
            <BeneficiosTab
              tenantId={tenantId}
              benefits={benefits}
              onRefresh={refreshBenefits}
              onToast={toast}
            />
          )}


          {/* TAB: MOSAICO */}
          {activeTab === 'mosaico' && tenantId && (
            <MosaicoTab
              tenantId={tenantId}
              mosaics={mosaics}
              onRefresh={refreshMosaics}
              onToast={toast}
            />
          )}
        </div>

        {/* Footer do Painel - Botão Salvar */}
        <div
          style={{
            padding: '24px',
            borderTop: '1px solid #222',
            backgroundColor: '#0A0A0A'
          }}
        >
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              width: '100%',
              backgroundColor: '#C9A84C',
              color: '#080808',
              border: 'none',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* PREVIEW (Direita) */}
      {
        showPreview && (
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: '#080808'
            }}
          >
            <StorePreview
              settings={settings}
              showFullPage={true}
              banners={banners}
              campaigns={campaigns}
              benefits={benefits}
              mosaics={mosaics}
            />
          </div>
        )
      }
    </div >
  );
}
