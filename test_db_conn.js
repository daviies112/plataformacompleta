import pg from 'pg';

const connectionString = 'postgresql://postgres:230723Davi%23b@db.axrvyrpefpntacuibyds.supabase.co:5432/postgres';
const client = new pg.Client({ connectionString });

async function checkN8nTable() {
    try {
        await client.connect();

        // Check n8n_chat_histories
        console.log('\n--- Structure of table "n8n_chat_histories" ---');
        const res = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'n8n_chat_histories'");
        if (res.rows.length === 0) {
            console.log('❌ Tabela não encontrada!');
        } else {
            res.rows.forEach(row => console.log(` - ${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`));
        }

        // Check n8n_chat_histories_gerente
        console.log('\n--- Structure of table "n8n_chat_histories_gerente" ---');
        const resGerente = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'n8n_chat_histories_gerente'");
        if (resGerente.rows.length === 0) {
            console.log('❌ Tabela não encontrada!');
        } else {
            resGerente.rows.forEach(row => console.log(` - ${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`));
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

checkN8nTable();
