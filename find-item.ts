
import 'dotenv/config';
import { getDynamicSupabaseClient } from './server/lib/multiTenantSupabase';

async function test() {
    console.log('Fetching real page from Supabase...');
    try {
        const supabase = await getDynamicSupabaseClient('master');
        const { data, error } = await supabase.from('workspace_pages').select('id, title').limit(1);

        if (error) throw error;
        if (!data || data.length === 0) {
            console.log('No pages found in Supabase.');
            process.exit(0);
        }

        console.log('Found page:', data[0]);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

test();
