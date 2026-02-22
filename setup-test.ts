
import 'dotenv/config';
import { db } from './server/db';
import { workspacePublicMapping } from './shared/db-schema';
import { getDynamicSupabaseClient } from './server/lib/multiTenantSupabase';

async function test() {
    const itemId = 'mlodh7k3vsbr664q63l';

    console.log('1. Setting is_public=true for item in Supabase...');
    try {
        const supabase = await getDynamicSupabaseClient('master');
        const { error: supError } = await supabase
            .from('workspace_pages')
            .update({ is_public: true, public_slug: 'wp_teste' })
            .eq('id', itemId);

        if (supError) throw supError;
        console.log('✅ Supabase updated');

        console.log('2. Inserting mapping into local DB...');
        await db.insert(workspacePublicMapping).values({
            id: 'wp_teste',
            itemId: itemId,
            itemType: 'page',
            tenantId: 'system',
            clientId: 'master',
            isActive: true
        }).onConflictDoUpdate({
            target: workspacePublicMapping.id,
            set: { updatedAt: new Date() }
        });
        console.log('✅ Mapping inserted/updated');

        console.log('\n🚀 TEST READY: Try curl http://localhost:5000/api/public/workspace/wp_teste');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

test();
