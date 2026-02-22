
import { Router } from 'express';
import { db } from '../db';
import { workspacePublicMapping } from '../../shared/db-schema';
import { eq, and } from 'drizzle-orm';
import { getDynamicSupabaseClient } from '../lib/multiTenantSupabase';

export const workspacePublicRoutes = Router();

// Utility functions for case conversion
function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamelCase(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
        const converted: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const camelKey = toCamelCase(key);
                converted[camelKey] = convertKeysToCamelCase(obj[key]);
            }
        }
        return converted;
    }

    return obj;
}

/**
 * GET /api/public/workspace/:token
 * Busca um item do workspace (Página, Database ou Board) pelo seu token público
 */
workspacePublicRoutes.get('/:token', async (req: any, res: any) => {
    try {
        const { token } = req.params;

        console.log(`🌐 [WorkspacePublic] Buscando item pelo token: ${token}`);

        // 1. Resolver token na tabela de mapeamento
        const mapping = await db.query.workspacePublicMapping.findFirst({
            where: and(
                eq(workspacePublicMapping.id, token),
                eq(workspacePublicMapping.isActive, true)
            )
        });

        if (!mapping) {
            console.warn(`⚠️ [WorkspacePublic] Token inválido ou inativo: ${token}`);
            return res.status(404).json({ error: 'Link de workspace não encontrado ou inativo' });
        }

        const { itemId, itemType, tenantId, clientId } = mapping;

        // 2. Obter cliente Supabase dinâmico
        const supabase = await getDynamicSupabaseClient(clientId || 'master');
        if (!supabase) {
            return res.status(400).json({ error: 'Supabase não configurado para este cliente' });
        }

        // 3. Buscar item na tabela correspondente
        const tableMap: Record<string, string> = {
            'page': 'workspace_pages',
            'database': 'workspace_databases',
            'board': 'workspace_boards'
        };

        const tableName = tableMap[itemType];
        if (!tableName) {
            return res.status(400).json({ error: 'Tipo de item inválido' });
        }

        const { data: item, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', itemId)
            .single();

        if (error || !item) {
            console.error(`❌ [WorkspacePublic] Erro ao buscar item no Supabase:`, error);
            return res.status(404).json({ error: 'Item do workspace não encontrado' });
        }

        // Double check if it's still public in the main table
        if (!item.is_public) {
            console.warn(`⚠️ [WorkspacePublic] Item encontrado mas não está marcado como público: ${itemId}`);
            return res.status(403).json({ error: 'Este item não é mais público' });
        }

        // 4. Parse campos JSON que o Supabase/Postgres pode retornar como string
        const jsonFields = [
            'blocks', 'databases', 'properties', 'lists', 'cards',
            'labels', 'members', 'settings', 'columns', 'rows', 'views'
        ];

        jsonFields.forEach(field => {
            if (item[field] && typeof item[field] === 'string') {
                try {
                    item[field] = JSON.parse(item[field]);
                } catch (e) {
                    console.warn(`Fallback parse failed for field ${field}`);
                }
            }
        });

        // 5. Formatar e retornar os dados (Recursivo para converter as chaves dos objetos JSON)
        const formattedItem = convertKeysToCamelCase(item);

        res.json({
            success: true,
            item: formattedItem,
            type: itemType,
            tenantId
        });

    } catch (error: any) {
        console.error('❌ [WorkspacePublic] Erro crítico:', error);
        res.status(500).json({
            error: 'Erro interno ao carregar workspace',
            details: error.message
        });
    }
});

export default workspacePublicRoutes;
