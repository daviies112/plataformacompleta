
const { pool } = require('./server/db');
async function check() {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'store_campaigns' AND column_name = 'tenant_id'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit();
}
check();
