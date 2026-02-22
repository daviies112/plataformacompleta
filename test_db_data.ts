
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function run() {
    console.log('--- DATABASE DATA DIAGNOSTIC ---');
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL not found in .env');
        return;
    }

    const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        const result = await pool.query('SELECT id, title, lists FROM workspace_boards');
        console.log(`Found ${result.rows.length} boards.`);

        result.rows.forEach(board => {
            console.log(`\n--- BOARD: ${board.title} (ID: ${board.id}) ---`);
            let lists = board.lists;
            if (typeof lists === 'string') {
                try {
                    lists = JSON.parse(lists);
                } catch (e) {
                    console.log('Error parsing lists string');
                    return;
                }
            }

            if (Array.isArray(lists)) {
                lists.forEach(list => {
                    console.log(`  List: ${list.title || list.name}`);
                    const cards = list.cards || list.itens || [];
                    cards.forEach((card: any) => {
                        console.log(`    Card: ${card.title || card.name}`);
                        console.log(`      Full Card JSON: ${JSON.stringify(card)}`);
                    });
                });
            } else {
                console.log('  Lists is not an array:', typeof lists);
            }
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
