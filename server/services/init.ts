import { db } from '../db';
import { tenants, users, usuariosTenant } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const DEFAULT_TENANT_SLUG = 'meetflow';
const DEFAULT_USER_EMAIL = 'admin@meetflow.local';

export async function initializeDefaultTenantAndUser() {
  console.log('[Init] Verificando tenant e usuário padrão...');

  try {
    let [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, DEFAULT_TENANT_SLUG))
      .limit(1);

    if (!tenant) {
      console.log('[Init] Criando tenant padrão...');
      [tenant] = await db
        .insert(tenants)
        .values({
          nome: 'MeetFlow',
          slug: DEFAULT_TENANT_SLUG,
          email: DEFAULT_USER_EMAIL,
          appAccessKey: process.env.HMS_APP_ACCESS_KEY || null,
          appSecret: process.env.HMS_APP_SECRET || null,
          token100ms: process.env.HMS_MANAGEMENT_TOKEN || null,
          configuracoes: {
            horario_comercial: { inicio: '09:00', fim: '18:00' },
            duracao_padrao: 30,
            cores: { primaria: '#3B82F6', secundaria: '#1E40AF' },
            templateId100ms: process.env.HMS_TEMPLATE_ID || null,
          },
        })
        .returning();
      console.log('[Init] Tenant padrão criado:', tenant.id);
    } else {
      const updates: any = { updatedAt: new Date() };
      let needsUpdate = false;
      
      // Trim values to remove any leading/trailing whitespace
      const hmsAccessKey = process.env.HMS_APP_ACCESS_KEY?.trim();
      const hmsAppSecret = process.env.HMS_APP_SECRET?.trim();
      const hmsManagementToken = process.env.HMS_MANAGEMENT_TOKEN?.trim();
      const hmsTemplateId = process.env.HMS_TEMPLATE_ID?.trim();
      
      if (hmsAccessKey && tenant.appAccessKey !== hmsAccessKey) {
        updates.appAccessKey = hmsAccessKey;
        needsUpdate = true;
      }
      if (hmsAppSecret && tenant.appSecret !== hmsAppSecret) {
        updates.appSecret = hmsAppSecret;
        needsUpdate = true;
      }
      if (hmsManagementToken && tenant.token100ms !== hmsManagementToken) {
        updates.token100ms = hmsManagementToken;
        needsUpdate = true;
      }
      
      // Update templateId100ms column directly (not just in configuracoes)
      if (hmsTemplateId && tenant.templateId100ms !== hmsTemplateId) {
        updates.templateId100ms = hmsTemplateId;
        needsUpdate = true;
      }
      
      // Also update templateId100ms in configuracoes for backward compatibility
      const currentConfig = (tenant.configuracoes as any) || {};
      if (hmsTemplateId && currentConfig.templateId100ms !== hmsTemplateId) {
        updates.configuracoes = {
          ...currentConfig,
          templateId100ms: hmsTemplateId,
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        [tenant] = await db
          .update(tenants)
          .set(updates)
          .where(eq(tenants.id, tenant.id))
          .returning();
        console.log('[Init] Credenciais do tenant atualizadas');
      }
    }

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, DEFAULT_USER_EMAIL))
      .limit(1);

    if (!user) {
      console.log('[Init] Criando usuário padrão...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      [user] = await db
        .insert(users)
        .values({
          username: DEFAULT_USER_EMAIL,
          password: hashedPassword,
        })
        .returning();
      console.log('[Init] Usuário padrão criado:', user.id);
    }

    let [userTenant] = await db
      .select()
      .from(usuariosTenant)
      .where(eq(usuariosTenant.userId, user.id))
      .limit(1);

    if (!userTenant) {
      console.log('[Init] Associando usuário ao tenant...');
      [userTenant] = await db
        .insert(usuariosTenant)
        .values({
          tenantId: tenant.id,
          userId: user.id,
          nome: 'Administrador',
          email: DEFAULT_USER_EMAIL,
          role: 'admin',
        })
        .returning();
      console.log('[Init] Associação criada');
    }

    console.log('[Init] Inicialização concluída com sucesso');
    return { tenant, user, userTenant };
  } catch (error) {
    console.error('[Init] Erro na inicialização:', error);
    throw error;
  }
}

export function getDefaultCredentials() {
  return {
    tenantSlug: DEFAULT_TENANT_SLUG,
    userEmail: DEFAULT_USER_EMAIL,
  };
}
