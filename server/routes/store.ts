import { Router, Request, Response } from 'express';
import { storeService } from '../services/storeService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type {
  StoreSettings,
  StoreBanner,
  StoreCategory,
  StoreProduct,
  StoreProductImage,
  StoreResellerProfile,
  StoreBenefit,
  StoreVideo,
  StoreMosaic,
  StoreCampaign
} from '../services/storeService';

const router = Router();

// Configure multer for temporary storage
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for videos
  }
});


// ============================================
// HELPER: Extrair tenant_id da requisição
// ============================================

function getTenantId(req: Request): string {
  return (
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    (req.body?.tenant_id as string) ||
    (req.session as any)?.tenantId ||
    ''
  );
}

function getResellerId(req: Request): string {
  return (
    (req.headers['x-reseller-id'] as string) ||
    (req.query.resellerId as string) ||
    (req.body?.reseller_id as string) ||
    (req.session as any)?.userId ||
    ''
  );
}

// ============================================
// FILE UPLOADS
// ============================================

// POST /api/store/upload - Upload de arquivos para o Supabase Storage
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const file = req.file;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Determinar bucket com base no tipo de arquivo ou pasta
    const folder = req.body.folder || 'misc';
    const bucketName = 'store-assets'; // Bucket unificado para a loja

    const url = await storeService.uploadFile(tenantId, bucketName, folder, file);

    if (!url) {
      return res.status(500).json({ error: 'Erro ao fazer upload para o Storage' });
    }

    // Limpar arquivo temporário
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({ url });
  } catch (error) {
    console.error('[Store API] Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno no upload' });
  }
});

// ============================================
// STORE SETTINGS (Personalizações)
// ============================================

// GET /api/store/settings - Buscar configurações da loja
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const settings = await storeService.getStoreSettings(tenantId);

    if (!settings) {
      // Retornar configurações padrão se não existir
      return res.json({
        tenant_id: tenantId,
        store_name: 'Minha Loja',
        color_primary: '#C9A84C',
        color_background: '#080808',
        color_surface: '#111111',
        color_text_primary: '#F5F0E8',
        font_heading: 'Cormorant Garamond',
        font_body: 'DM Sans',
        layout_type: 'grid',
        layout_columns: 3
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('[Store API] Erro ao buscar settings:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/store/settings - Salvar configurações
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const settings = await storeService.saveStoreSettings(tenantId, req.body);

    if (!settings) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }

    res.json(settings);
  } catch (error) {
    console.error('[Store API] Erro ao salvar settings:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// ============================================
// BANNERS
// ============================================

// GET /api/store/banners - Listar banners
router.get('/banners', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const banners = await storeService.getBanners(tenantId, activeOnly);
    res.json(banners);
  } catch (error) {
    console.error('[Store API] Erro ao buscar banners:', error);
    res.status(500).json({ error: 'Erro ao buscar banners' });
  }
});

// POST /api/store/banners - Criar banner
router.post('/banners', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const banner = await storeService.saveBanner(tenantId, req.body);

    if (!banner) {
      return res.status(500).json({ error: 'Erro ao criar banner' });
    }

    res.json(banner);
  } catch (error) {
    console.error('[Store API] Erro ao criar banner:', error);
    res.status(500).json({ error: 'Erro ao criar banner' });
  }
});

// PUT /api/store/banners/:id - Atualizar banner
router.put('/banners/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const banner = await storeService.saveBanner(tenantId, {
      ...req.body,
      id
    });

    if (!banner) {
      return res.status(500).json({ error: 'Erro ao atualizar banner' });
    }

    res.json(banner);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar banner:', error);
    res.status(500).json({ error: 'Erro ao atualizar banner' });
  }
});

// DELETE /api/store/banners/:id - Deletar banner
router.delete('/banners/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteBanner(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar banner' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar banner:', error);
    res.status(500).json({ error: 'Erro ao deletar banner' });
  }
});

// ============================================
// TAGS (Etiquetas)
// ============================================

// GET /api/store/tags - Listar todas as tags únicas
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const tags = await storeService.getTags(tenantId);
    res.json(tags);
  } catch (error) {
    console.error('[Store API] Erro ao buscar tags:', error);
    res.status(500).json({ error: 'Erro ao buscar tags' });
  }
});

// ============================================
// CATEGORIES
// ============================================

// GET /api/store/categories - Listar categorias
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const categories = await storeService.getCategories(tenantId, activeOnly);
    res.json(categories);
  } catch (error) {
    console.error('[Store API] Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /api/store/categories - Criar categoria
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const category = await storeService.saveCategory(tenantId, req.body);

    if (!category) {
      return res.status(500).json({ error: 'Erro ao criar categoria' });
    }

    res.json(category);
  } catch (error) {
    console.error('[Store API] Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// PUT /api/store/categories/:id - Atualizar categoria
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const category = await storeService.saveCategory(tenantId, {
      ...req.body,
      id
    });

    if (!category) {
      return res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }

    res.json(category);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// DELETE /api/store/categories/:id - Deletar categoria
router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteCategory(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar categoria' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar categoria:', error);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// ============================================
// PRODUCTS
// ============================================

// GET /api/store/products - Listar produtos
router.get('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const resellerId = getResellerId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const products = await storeService.getProducts(tenantId, resellerId || undefined, activeOnly);
    res.json(products);
  } catch (error) {
    console.error('[Store API] Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// GET /api/store/products/:id - Buscar produto por ID
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const product = await storeService.getProductById(tenantId, id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('[Store API] Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// GET /api/store/products/slug/:slug - Buscar produto por slug
router.get('/products/slug/:slug', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { slug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const product = await storeService.getProductBySlug(tenantId, slug);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('[Store API] Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// POST /api/store/products - Criar produto
router.post('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const resellerId = getResellerId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const product = await storeService.saveProduct(tenantId, {
      ...req.body,
      reseller_id: resellerId || req.body.reseller_id
    });

    if (!product) {
      return res.status(500).json({ error: 'Erro ao criar produto' });
    }

    res.json(product);
  } catch (error) {
    console.error('[Store API] Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// PUT /api/store/products/:id - Atualizar produto
router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const product = await storeService.saveProduct(tenantId, {
      ...req.body,
      id
    });

    if (!product) {
      return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }

    res.json(product);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /api/store/products/:id - Deletar produto
router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteProduct(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar produto' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// ============================================
// PRODUCT IMAGES
// ============================================

// GET /api/store/products/:productId/images - Listar imagens do produto
router.get('/products/:productId/images', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const images = await storeService.getProductImages(productId);
    res.json(images);
  } catch (error) {
    console.error('[Store API] Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
});

// POST /api/store/products/:productId/images - Adicionar imagem
router.post('/products/:productId/images', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const image = await storeService.saveProductImage(tenantId, {
      ...req.body,
      product_id: productId
    });

    if (!image) {
      return res.status(500).json({ error: 'Erro ao adicionar imagem' });
    }

    res.json(image);
  } catch (error) {
    console.error('[Store API] Erro ao adicionar imagem:', error);
    res.status(500).json({ error: 'Erro ao adicionar imagem' });
  }
});

// DELETE /api/store/images/:id - Deletar imagem
router.delete('/images/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteProductImage(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar imagem' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar imagem:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
});

// ============================================
// RESELLER PROFILE
// ============================================

// GET /api/store/profile - Buscar perfil da revendedora
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const resellerId = getResellerId(req);

    if (!tenantId || !resellerId) {
      return res.status(400).json({ error: 'tenant_id e reseller_id são obrigatórios' });
    }

    const profile = await storeService.getResellerProfile(tenantId, resellerId);

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    res.json(profile);
  } catch (error) {
    console.error('[Store API] Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /api/store/profile - Atualizar perfil
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const resellerId = getResellerId(req);

    if (!tenantId || !resellerId) {
      return res.status(400).json({ error: 'tenant_id e reseller_id são obrigatórios' });
    }

    const profile = await storeService.saveResellerProfile(tenantId, {
      ...req.body,
      reseller_id: resellerId
    });

    if (!profile) {
      return res.status(500).json({ error: 'Erro ao salvar perfil' });
    }

    res.json(profile);
  } catch (error) {
    console.error('[Store API] Erro ao salvar perfil:', error);
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

// ============================================
// BENEFITS (Benefícios)
// ============================================

// GET /api/store/benefits - Listar benefícios
router.get('/benefits', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const benefits = await storeService.getBenefits(tenantId, activeOnly);
    res.json(benefits);
  } catch (error) {
    console.error('[Store API] Erro ao buscar benefícios:', error);
    res.status(500).json({ error: 'Erro ao buscar benefícios' });
  }
});

// POST /api/store/benefits - Criar benefício
router.post('/benefits', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const benefit = await storeService.saveBenefit(tenantId, req.body);

    if (!benefit) {
      return res.status(500).json({ error: 'Erro ao criar benefício' });
    }

    res.json(benefit);
  } catch (error) {
    console.error('[Store API] Erro ao criar benefício:', error);
    res.status(500).json({ error: 'Erro ao criar benefício' });
  }
});

// PUT /api/store/benefits/:id - Atualizar benefício
router.put('/benefits/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const benefit = await storeService.saveBenefit(tenantId, { ...req.body, id });

    if (!benefit) {
      return res.status(500).json({ error: 'Erro ao atualizar benefício' });
    }

    res.json(benefit);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar benefício:', error);
    res.status(500).json({ error: 'Erro ao atualizar benefício' });
  }
});

// DELETE /api/store/benefits/:id - Deletar benefício
router.delete('/benefits/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteBenefit(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar benefício' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar benefício:', error);
    res.status(500).json({ error: 'Erro ao deletar benefício' });
  }
});

// ============================================
// VIDEOS (Vídeos Promocionais)
// ============================================

// GET /api/store/videos - Listar vídeos
router.get('/videos', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const videos = await storeService.getVideos(tenantId, activeOnly);
    res.json(videos);
  } catch (error) {
    console.error('[Store API] Erro ao buscar vídeos:', error);
    res.status(500).json({ error: 'Erro ao buscar vídeos' });
  }
});

// POST /api/store/videos - Criar vídeo
router.post('/videos', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const video = await storeService.saveVideo(tenantId, req.body);

    if (!video) {
      return res.status(500).json({ error: 'Erro ao criar vídeo' });
    }

    res.json(video);
  } catch (error) {
    console.error('[Store API] Erro ao criar vídeo:', error);
    res.status(500).json({ error: 'Erro ao criar vídeo' });
  }
});

// PUT /api/store/videos/:id - Atualizar vídeo
router.put('/videos/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const video = await storeService.saveVideo(tenantId, { ...req.body, id });

    if (!video) {
      return res.status(500).json({ error: 'Erro ao atualizar vídeo' });
    }

    res.json(video);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar vídeo:', error);
    res.status(500).json({ error: 'Erro ao atualizar vídeo' });
  }
});

// DELETE /api/store/videos/:id - Deletar vídeo
router.delete('/videos/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteVideo(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar vídeo' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar vídeo:', error);
    res.status(500).json({ error: 'Erro ao deletar vídeo' });
  }
});

// ============================================
// MOSAICS (Mosaico de Banners)
// ============================================

// GET /api/store/mosaics - Listar mosaicos
router.get('/mosaics', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const mosaics = await storeService.getMosaics(tenantId, activeOnly);
    res.json(mosaics);
  } catch (error) {
    console.error('[Store API] Erro ao buscar mosaicos:', error);
    res.status(500).json({ error: 'Erro ao buscar mosaicos' });
  }
});

// POST /api/store/mosaics - Criar mosaico
router.post('/mosaics', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const mosaic = await storeService.saveMosaic(tenantId, req.body);

    if (!mosaic) {
      return res.status(500).json({ error: 'Erro ao criar mosaico' });
    }

    res.json(mosaic);
  } catch (error) {
    console.error('[Store API] Erro ao criar mosaico:', error);
    res.status(500).json({ error: 'Erro ao criar mosaico' });
  }
});

// PUT /api/store/mosaics/:id - Atualizar mosaico
router.put('/mosaics/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const mosaic = await storeService.saveMosaic(tenantId, { ...req.body, id });

    if (!mosaic) {
      return res.status(500).json({ error: 'Erro ao atualizar mosaico' });
    }

    res.json(mosaic);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar mosaico:', error);
    res.status(500).json({ error: 'Erro ao atualizar mosaico' });
  }
});

// DELETE /api/store/mosaics/:id - Deletar mosaico
router.delete('/mosaics/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteMosaic(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar mosaico' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar mosaico:', error);
    res.status(500).json({ error: 'Erro ao deletar mosaico' });
  }
});

// ============================================
// CAMPAIGNS (Campanhas Sazonais)
// ============================================

// GET /api/store/campaigns - Listar campanhas
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const activeOnly = req.query.active === 'true';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const campaigns = await storeService.getCampaigns(tenantId, activeOnly);
    res.json(campaigns);
  } catch (error) {
    console.error('[Store API] Erro ao buscar campanhas:', error);
    res.status(500).json({ error: 'Erro ao buscar campanhas' });
  }
});

// GET /api/store/campaigns/active - Buscar campanha ativa no momento
router.get('/campaigns/active', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const campaign = await storeService.getActiveCampaign(tenantId);
    res.json(campaign || null);
  } catch (error) {
    console.error('[Store API] Erro ao buscar campanha ativa:', error);
    res.status(500).json({ error: 'Erro ao buscar campanha ativa' });
  }
});

// POST /api/store/campaigns - Criar campanha
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const campaign = await storeService.saveCampaign(tenantId, req.body);

    if (!campaign) {
      return res.status(500).json({ error: 'Erro ao criar campanha' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('[Store API] Erro ao criar campanha:', error);
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
});

// PUT /api/store/campaigns/:id - Atualizar campanha
router.put('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const campaign = await storeService.saveCampaign(tenantId, { ...req.body, id });

    if (!campaign) {
      return res.status(500).json({ error: 'Erro ao atualizar campanha' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('[Store API] Erro ao atualizar campanha:', error);
    res.status(500).json({ error: 'Erro ao atualizar campanha' });
  }
});

// DELETE /api/store/campaigns/:id - Deletar campanha
router.delete('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const success = await storeService.deleteCampaign(tenantId, id);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao deletar campanha' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Store API] Erro ao deletar campanha:', error);
    res.status(500).json({ error: 'Erro ao deletar campanha' });
  }
});

export default router;
