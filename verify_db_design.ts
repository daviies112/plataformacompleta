import pg from 'pg';
const { Client } = pg;

async function run() {
    const connectionString = "postgresql://postgres.qvcsyhdgfeseyehfqcff:230723Davi%23b@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.');

        // List all tables and row counts
        const res = await client.query(`
      SELECT schemaname, relname, n_live_tup 
      FROM pg_stat_user_tables 
      ORDER BY n_live_tup DESC
    `);

        console.log('--- Table Row Counts ---');
        res.rows.forEach(row => {
            console.log(`${row.schemaname}.${row.relname}: ${row.n_live_tup}`);
        });
        console.log('------------------------');

        // Also try to select from forms specifically
        const formsRes = await client.query('SELECT count(*) FROM forms');
        console.log(`Real Count in forms: ${formsRes.rows[0].count}`);

    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await client.end();
    }
}

run();
