import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuthService } from '../services/adminAuth';
import { saveCompanySlug } from '../lib/tenantSlug';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'demo-secret-key-for-development-only';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (decoded.role !== 'superadmin' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await adminAuthService.verifyLogin(email, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error || 'Invalid credentials'
      });
    }

    if (result.user?.company_name && result.user?.tenant_id) {
      const slug = result.user.company_name.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (slug) {
        const tid = result.user.tenant_id;
        saveCompanySlug(tid, slug).catch(() => {});
        
        (async () => {
          try {
            const { db } = await import('../db.js');
            const { appSettings, formTenantMapping } = await import('../../shared/db-schema.js');
            const { eq, isNull } = await import('drizzle-orm');
            
            const [existing] = await db.select().from(appSettings).limit(1);
            if (existing) {
              await db.update(appSettings).set({ companySlug: slug }).where(eq(appSettings.id, existing.id));
            }
            
            await db.update(formTenantMapping)
              .set({ companySlug: slug })
              .where(eq(formTenantMapping.tenantId, tid));
            
            console.log(`[Auth] Synced companySlug "${slug}" to app_settings and form_tenant_mapping for tenant ${tid}`);
          } catch (err) {
            console.warn('[Auth] Error syncing companySlug on login:', err);
          }
        })();
      }
    }

    const credentials = {
      whatsapp: true,
      evolution_api: true,
      supabase_configured: adminAuthService.isConfigured(),
      n8n_configured: true
    };

    res.json({
      success: true,
      token: result.token,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role
      },
      client: result.client,
      credentials
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/validate', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'demo-secret-key-for-development-only';
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    res.json({
      success: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name || 'Usuário',
        role: decoded.role || 'admin'
      },
      client: {
        id: decoded.clientId || decoded.userId,
        name: decoded.companyName || 'Empresa',
        email: decoded.email,
        plan_type: decoded.planType || 'pro'
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

router.post('/admin/create', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { email, password, name, companyName, companyEmail, planType, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password and name are required'
      });
    }

    const result = await adminAuthService.createAdmin(
      email,
      password,
      name,
      companyName,
      companyEmail,
      planType,
      role
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      userId: result.userId,
      message: `Administrador ${email} criado com sucesso`
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/admin/list', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const admins = await adminAuthService.listAdmins();
    
    res.json({
      success: true,
      admins: admins.map(admin => ({
        ...admin,
        password_hash: undefined
      }))
    });

  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.put('/admin/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await adminAuthService.updateAdmin(id, updates);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Administrador atualizado com sucesso'
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.delete('/admin/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const result = await adminAuthService.deleteAdmin(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Administrador desativado com sucesso'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/admin/diagnose', async (req, res) => {
  try {
    const { supabaseOwner, SUPABASE_CONFIGURED } = await import('../config/supabaseOwner');
    
    const diagnosis: any = {
      supabase_owner_configured: SUPABASE_CONFIGURED,
      admin_users_table_exists: false,
      rpc_function_exists: false,
      sample_admin: null,
      error: null
    };

    if (!SUPABASE_CONFIGURED || !supabaseOwner) {
      diagnosis.error = 'Supabase Owner não configurado';
      return res.json(diagnosis);
    }

    const { data: tableCheck, error: tableError } = await supabaseOwner
      .from('admin_users')
      .select('id')
      .limit(1);
    
    if (!tableError) {
      diagnosis.admin_users_table_exists = true;
      
      const { data: admins } = await supabaseOwner
        .from('admin_users')
        .select('id, email, name, role, is_active, created_at')
        .limit(5);
      
      diagnosis.sample_admin = admins || [];
    } else {
      diagnosis.table_error = tableError.message;
    }

    const { data: rpcCheck, error: rpcError } = await supabaseOwner.rpc('verificar_login_admin', {
      p_email: 'test@test.com',
      p_senha: 'test'
    });
    
    if (!rpcError || rpcError.code !== 'PGRST202') {
      diagnosis.rpc_function_exists = true;
    } else {
      diagnosis.rpc_error = rpcError.message;
    }

    res.json(diagnosis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as authRoutes };
