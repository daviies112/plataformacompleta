# 📊 Documentação - Schema da Loja de Semijoias

## 🎯 Visão Geral

Sistema completo de e-commerce white-label onde:
- **Administrador** personaliza 100% do visual (logo, cores, layout)
- **Revendedora** adiciona produtos e gerencia seu estoque
- **Loja Pública** exibe tudo com design premium inspirado em Vivara/Pandora

## 🎨 Design System: NACRE (Madrepérola)

### Paleta de Cores
```
Dourado Principal:  #C9A84C  (gold-pure)
Dourado Claro:      #E8CC7A  (gold-light - hover)
Dourado Escuro:     #7A6128  (gold-dim)
Fundo Principal:    #080808  (bg-void - dark)
Superfície/Cards:   #111111  (bg-surface)
Texto Principal:    #F5F0E8  (pearl-white)
Texto Secundário:   #B8B0A0  (pearl-mid)
```

### Tipografia
- **Títulos:** Cormorant Garamond (serif elegante)
- **Interface:** DM Sans (moderna e limpa)

---

## 📁 Tabelas do Banco de Dados

### 1. `store_settings` - Personalizações do Admin

Armazena **todas** as configurações visuais e comportamentais da loja.

**Campos Principais:**
```sql
- tenant_id              -- ID do cliente (multi-tenant)
- logo_url               -- URL do logo
- store_name             -- Nome da loja
- color_primary          -- Cor primária (#C9A84C padrão)
- color_background       -- Cor de fundo (#080808 padrão)
- font_heading           -- Fonte dos títulos
- layout_type            -- Tipo de layout (grid/masonry/carousel)
- show_banner            -- Exibir banner na home?
- footer_text            -- Texto do rodapé
- whatsapp_number        -- WhatsApp para contato
```

**Exemplo de Registro:**
```json
{
  "tenant_id": "abc123",
  "logo_url": "https://...",
  "store_name": "Joias Elegantes",
  "color_primary": "#C9A84C",
  "font_heading": "Cormorant Garamond",
  "layout_type": "grid",
  "layout_columns": 3
}
```

---

### 2. `store_banners` - Banners da Home

Banners rotativos/estáticos para a página inicial.

**Campos Principais:**
```sql
- tenant_id              -- ID do cliente
- title                  -- Título do banner
- image_url              -- Imagem do banner (desktop)
- mobile_image_url       -- Imagem otimizada (mobile)
- cta_text               -- Texto do botão (ex: "Ver Coleção")
- cta_url                -- Link do botão
- display_order          -- Ordem de exibição
- is_active              -- Banner ativo?
```

---

### 3. `store_categories` - Categorias de Produtos

Categorias hierárquicas para organizar produtos.

**Campos Principais:**
```sql
- tenant_id              -- ID do cliente
- name                   -- Nome (ex: "Anéis")
- slug                   -- URL amigável (ex: "aneis")
- description            -- Descrição da categoria
- icon                   -- Ícone (ex: "gem", "sparkles")
- parent_id              -- Categoria pai (hierarquia)
- display_order          -- Ordem de exibição
```

**Exemplo de Hierarquia:**
```
Joias (parent_id: null)
  └─ Anéis (parent_id: joias_id)
  └─ Colares (parent_id: joias_id)
```

---

### 4. `store_products` - Produtos da Revendedora

Produtos adicionados pela revendedora.

**Campos Principais:**
```sql
- tenant_id              -- ID do cliente
- reseller_id            -- ID da revendedora
- name                   -- Nome do produto
- slug                   -- URL amigável
- description            -- Descrição completa
- price                  -- Preço atual
- compare_at_price       -- Preço "de" (desconto)
- category_id            -- Categoria do produto
- stock_quantity         -- Quantidade em estoque
- is_active              -- Produto ativo na loja?
- is_featured            -- Produto em destaque?
```

**Exemplo de Registro:**
```json
{
  "name": "Anel Solitário Dourado",
  "slug": "anel-solitario-dourado",
  "price": 129.90,
  "compare_at_price": 199.90,
  "category_id": "uuid-aneis",
  "stock_quantity": 10,
  "is_featured": true
}
```

---

### 5. `store_product_images` - Imagens dos Produtos

Múltiplas imagens por produto.

**Campos Principais:**
```sql
- product_id             -- ID do produto
- image_url              -- URL da imagem
- thumbnail_url          -- Thumbnail (preview)
- display_order          -- Ordem de exibição
- is_primary             -- Imagem principal?
```

---

### 6. `store_product_variants` - Variações de Produtos

Variações de tamanho, cor, modelo, etc.

**Campos Principais:**
```sql
- product_id             -- ID do produto
- name                   -- Nome da variação
- sku                    -- Código único
- price                  -- Preço (se diferente)
- attributes             -- JSON: {"cor": "Dourado", "tamanho": "P"}
- stock_quantity         -- Estoque da variação
```

**Exemplo:**
```json
{
  "product_id": "uuid-produto",
  "name": "Dourado - Tamanho P",
  "attributes": {
    "cor": "Dourado",
    "tamanho": "P"
  },
  "stock_quantity": 5
}
```

---

### 7. `store_pages` - Páginas Customizáveis

Páginas estáticas criadas pelo admin (Sobre, Política, etc).

**Campos Principais:**
```sql
- tenant_id              -- ID do cliente
- title                  -- Título da página
- slug                   -- URL (ex: "sobre")
- content                -- Conteúdo HTML/Markdown
- show_in_menu           -- Mostrar no menu?
```

---

### 8. `store_reseller_profiles` - Perfil da Revendedora

Informações da revendedora exibidas na loja.

**Campos Principais:**
```sql
- tenant_id              -- ID do cliente
- reseller_id            -- ID único da revendedora
- name                   -- Nome da revendedora
- bio                    -- Biografia
- avatar_url             -- Foto de perfil
- whatsapp               -- WhatsApp
- instagram              -- Instagram
- custom_slug            -- URL personalizada (/loja/maria-silva)
```

---

## 🔄 Fluxo de Dados

### 1. Admin Personaliza a Loja
```
Admin acessa /revendedoras/personalizar
  ↓
Preenche cores, logo, layout
  ↓
Dados salvos em `store_settings`
  ↓
Preview atualiza em tempo real
```

### 2. Revendedora Adiciona Produtos
```
Revendedora acessa /meus-produtos
  ↓
Adiciona produto (nome, preço, fotos)
  ↓
Produto salvo em `store_products`
  ↓
Imagens salvas em `store_product_images`
```

### 3. Cliente Visita a Loja
```
Cliente acessa /loja/maria-silva
  ↓
Sistema carrega:
  - store_settings (design)
  - store_products (produtos)
  - store_reseller_profiles (perfil)
  ↓
Renderiza loja personalizada
```

---

## 🎨 Aplicação do Design System

### Na Loja Pública

**Cores Dinâmicas:**
```tsx
<div
  style={{
    backgroundColor: settings.color_background,
    color: settings.color_text_primary
  }}
>
  <button
    style={{
      backgroundColor: settings.color_primary,
      fontFamily: settings.font_body
    }}
  >
    Comprar
  </button>
</div>
```

**Tipografia:**
```tsx
<h1 style={{ fontFamily: settings.font_heading }}>
  {settings.store_name}
</h1>

<p style={{ fontFamily: settings.font_body }}>
  {product.description}
</p>
```

---

## 🚀 Próximos Passos

1. ✅ Schema criado
2. ⏳ Criar rotas e services no servidor
3. ⏳ Criar página de personalização (Admin)
4. ⏳ Criar interface de produtos (Revendedora)
5. ⏳ Criar loja pública dinâmica
6. ⏳ Testar multi-tenancy e isolamento de dados

---

## 📝 Notas Importantes

- **Multi-Tenant:** Todas as tabelas têm `tenant_id`
- **Isolamento:** Cada cliente vê apenas seus dados
- **Supabase:** Todas as queries devem filtrar por `tenant_id`
- **Row Level Security (RLS):** Configurar políticas para segurança adicional

---

## 🔗 Referências

- Design inspirado em: Vivara, Pandora, Tiffany & Co
- Paleta Nacre: Dourado elegante + Dark luxury
- Framework: React + TypeScript + Supabase
