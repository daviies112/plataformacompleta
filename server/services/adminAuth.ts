import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseOwner, SUPABASE_CONFIGURED, SUPABASE_OWNER_URL, SUPABASE_OWNER_KEY } from '../config/supabaseOwner';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company_name: string | null;
  company_email: string | null;
  plan_type: string;
  tenant_id: string;
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  token?: string;
  client?: {
    id: string;
    name: string;
    email: string;
    plan_type: string;
  };
  error?: string;
}

class AdminAuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'demo-secret-key-for-development-only';
  }

  isConfigured(): boolean {
    return SUPABASE_CONFIGURED && supabaseOwner !== null;
  }

  async verifyLogin(email: string, password: string): Promise<LoginResult> {
    if (!this.isConfigured()) {
      console.log('[AdminAuth] Supabase Owner não configurado, usando fallback');
      return this.fallbackLogin(email, password);
    }

    try {
      console.log(`[AdminAuth] Verificando login para: ${email}`);

      // Tenta primeiro a função RPC get_admin_by_email (mais confiável)
      const { data: rpcData, error: rpcError } = await supabaseOwner!.rpc('get_admin_by_email', {
        p_email: email
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('[AdminAuth] ✅ Usuário encontrado via RPC get_admin_by_email');
        const userData = rpcData[0];

        const isValidPassword = await bcrypt.compare(password, userData.password_hash);
        if (!isValidPassword) {
          console.log('[AdminAuth] Senha inválida');
          return { success: false, error: 'Credenciais inválidas' };
        }

        await this.updateLastLogin(userData.id);
        return this.generateLoginResponse(userData);
      }

      if (rpcError) {
        console.log('[AdminAuth] RPC get_admin_by_email falhou:', rpcError.message);
      }

      // Fallback para query direta
      console.log('[AdminAuth] Tentando query direta...');
      return this.directLogin(email, password);

    } catch (error) {
      console.error('[AdminAuth] Erro no login:', error);
      return this.fallbackLogin(email, password);
    }
  }

  async directLogin(email: string, password: string): Promise<LoginResult> {
    // Primeiro tenta via Supabase client
    if (supabaseOwner) {
      try {
        console.log('[AdminAuth] Tentando login direto na tabela admin_users');

        const { data, error } = await supabaseOwner
          .from('admin_users')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          const isValidPassword = await bcrypt.compare(password, data.password_hash);
          if (!isValidPassword) {
            console.log('[AdminAuth] Senha inválida');
            return { success: false, error: 'Credenciais inválidas' };
          }

          await this.updateLastLogin(data.id);
          return this.generateLoginResponse(data);
        }

        console.log('[AdminAuth] Supabase client falhou, tentando REST API:', error?.message);
      } catch (error) {
        console.log('[AdminAuth] Erro no client, tentando REST API:', error);
      }
    }

    // Fallback para REST API direta (bypassa schema cache)
    return this.restApiLogin(email, password);
  }

  private async restApiLogin(email: string, password: string): Promise<LoginResult> {
    if (!SUPABASE_OWNER_URL || !SUPABASE_OWNER_KEY) {
      console.log('[AdminAuth] REST API: Credenciais não configuradas');
      return this.fallbackLogin(email, password);
    }

    try {
      console.log('[AdminAuth] Tentando login via REST API direto');

      const restUrl = `${SUPABASE_OWNER_URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=*`;

      const response = await fetch(restUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_OWNER_KEY,
          'Authorization': `Bearer ${SUPABASE_OWNER_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[AdminAuth] REST API erro:', response.status, errorText);
        return this.fallbackLogin(email, password);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        console.log('[AdminAuth] REST API: Usuário não encontrado');
        return this.fallbackLogin(email, password);
      }

      const userData = data[0];

      const isValidPassword = await bcrypt.compare(password, userData.password_hash);
      if (!isValidPassword) {
        console.log('[AdminAuth] Senha inválida');
        return { success: false, error: 'Credenciais inválidas' };
      }

      await this.updateLastLogin(userData.id);
      console.log('[AdminAuth] ✅ Login via REST API bem-sucedido');

      return this.generateLoginResponse(userData);

    } catch (error) {
      console.error('[AdminAuth] Erro no REST API login:', error);
      return this.fallbackLogin(email, password);
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    if (!supabaseOwner) return;

    try {
      // Tenta a nova função update_admin_last_login
      await supabaseOwner.rpc('update_admin_last_login', { p_user_id: userId });
      console.log('[AdminAuth] Último login atualizado via RPC');
    } catch (error) {
      // Fallback silencioso - não crítico
      console.log('[AdminAuth] Não foi possível atualizar último login (não crítico)');
    }
  }

  private generateLoginResponse(userData: any): LoginResult {
    const user: AdminUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'admin',
      company_name: userData.company_name,
      company_email: userData.company_email,
      plan_type: userData.plan_type || 'pro',
      tenant_id: userData.tenant_id || `dev-${userData.email.replace('@', '_').replace(/\./g, '_')}`
    };

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        clientId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        companyName: user.company_name || user.name,
        companyEmail: user.company_email || user.email,
        planType: user.plan_type
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    console.log(`[AdminAuth] ✅ Login bem-sucedido para: ${user.email} (tenant: ${user.tenant_id})`);

    return {
      success: true,
      user,
      token,
      client: {
        id: user.id,
        name: user.company_name || user.name,
        email: user.company_email || user.email,
        plan_type: user.plan_type
      }
    };
  }

  private async fallbackLogin(email: string, password: string, force: boolean = false): Promise<LoginResult> {
    console.log('[AdminAuth] Usando fallback de desenvolvimento');

    const fallbackEmail = force ? email : (process.env.CLIENT_LOGIN_EMAIL || 'admin@empresa.com');
    const fallbackPasswordHash = process.env.CLIENT_LOGIN_PASSWORD_HASH ||
      '$2b$10$sxI6Ai8icfl0P3tKdF67wOsCmweeQvr314iAs/wIb3DDvowy60qP.';
    const fallbackName = process.env.CLIENT_USER_NAME || 'Administrador';
    const fallbackCompany = process.env.CLIENT_COMPANY_NAME || 'Sua Empresa';

    if (!force && email !== fallbackEmail) {
      return { success: false, error: 'Credenciais inválidas' };
    }

    if (!force) {
      const isValidPassword = await bcrypt.compare(password, fallbackPasswordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Credenciais inválidas' };
      }
    }

    const tenantId = `dev-${email.replace('@', '_').replace(/\./g, '_')}`;

    const user: AdminUser = {
      id: '1',
      email: fallbackEmail,
      name: fallbackName,
      role: 'admin',
      company_name: fallbackCompany,
      company_email: fallbackEmail,
      plan_type: 'pro',
      tenant_id: tenantId
    };

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        clientId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        companyName: user.company_name || user.name,
        companyEmail: user.company_email || user.email,
        planType: user.plan_type
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    console.log(`[AdminAuth] ✅ Login de desenvolvimento para: ${user.email}`);

    return {
      success: true,
      user,
      token,
      client: {
        id: user.id,
        name: user.company_name || user.name,
        email: user.company_email || user.email,
        plan_type: user.plan_type
      }
    };
  }

  async createAdmin(
    email: string,
    password: string,
    name: string,
    companyName?: string,
    companyEmail?: string,
    planType: string = 'pro',
    role: string = 'admin'
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase Owner não configurado' };
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const tenantId = `dev-${email.replace('@', '_').replace(/\./g, '_')}`;

      const { data: existingUser } = await supabaseOwner!
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return { success: false, error: 'Email já cadastrado' };
      }

      const { data, error } = await supabaseOwner!
        .from('admin_users')
        .insert({
          email,
          password_hash: passwordHash,
          name,
          company_name: companyName || null,
          company_email: companyEmail || null,
          plan_type: planType,
          role,
          tenant_id: tenantId,
          is_active: true
        })
        .select('id')
        .single();

      if (error) {
        console.error('[AdminAuth] Erro ao criar admin:', error);
        return { success: false, error: error.message };
      }

      console.log(`[AdminAuth] ✅ Administrador criado: ${email} (ID: ${data.id})`);

      return { success: true, userId: data.id };

    } catch (error: any) {
      console.error('[AdminAuth] Erro ao criar admin:', error);
      return { success: false, error: error.message };
    }
  }

  async listAdmins(): Promise<AdminUser[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabaseOwner!
        .from('admin_users')
        .select('id, email, name, role, company_name, company_email, plan_type, tenant_id, is_active, last_login, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminAuth] Erro ao listar admins:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('[AdminAuth] Erro ao listar admins:', error);
      return [];
    }
  }

  async updateAdmin(userId: string, updates: Partial<AdminUser & { password?: string }>): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase Owner não configurado' };
    }

    try {
      const updateData: any = { ...updates, updated_at: new Date().toISOString() };

      if (updates.password) {
        updateData.password_hash = await bcrypt.hash(updates.password, 10);
        delete updateData.password;
      }

      const { error } = await supabaseOwner!
        .from('admin_users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('[AdminAuth] Erro ao atualizar admin:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      console.error('[AdminAuth] Erro ao atualizar admin:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase Owner não configurado' };
    }

    try {
      const { error } = await supabaseOwner!
        .from('admin_users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('[AdminAuth] Erro ao desativar admin:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      console.error('[AdminAuth] Erro ao desativar admin:', error);
      return { success: false, error: error.message };
    }
  }
}

export const adminAuthService = new AdminAuthService();
