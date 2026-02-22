
const { pool } = require('./server/db');
const { decrypt } = require('./server/lib/credentialsManager');

async function check() {
    try {
        const res = await pool.query("SELECT * FROM supabase_config WHERE tenant_id = 'system'");
        if (res.rows.length > 0) {
            const config = res.rows[0];
            console.log('URL:', config.supabase_url);
            // Try decrypting if it looks encrypted
            try {
                console.log('Decrypted URL:', decrypt(config.supabase_url));
            } catch (e) { }
        } else {
            console.log('No config for system');
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
