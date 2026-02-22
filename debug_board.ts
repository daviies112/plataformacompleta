import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

console.log('--- DEBUG ENV ---');
console.log('CWD:', process.cwd());
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not Set');
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? 'Set' : 'Not Set');
console.log('-----------------');

async function checkBoardStructure() {
    try {
        console.log('Fetching one board from workspace_boards...');
        // Raw SQL to bypass any Drizzle schema assumptions if possible, or just use the query builder
        const result = await db.execute(sql`SELECT id, title, lists, cards FROM workspace_boards LIMIT 1`);

        if (result.rows.length === 0) {
            console.log('No boards found.');
            return;
        }

        const board = result.rows[0];
        console.log('Board ID:', board.id);
        console.log('Board Title:', board.title);

        console.log('--- Lists Type ---', typeof board.lists);
        let lists = board.lists;
        if (typeof lists === 'string') {
            try {
                lists = JSON.parse(lists);
                console.log('(Parsed lists from string)');
            } catch (e) {
                console.error('Error parsing lists JSON:', e);
            }
        }

        console.log('--- Lists Preview ---');
        if (Array.isArray(lists)) {
            console.log(`Found ${lists.length} lists.`);
            lists.forEach((list: any, i) => {
                console.log(`List ${i} [${list.id}]: ${list.title}`);
                if (list.cards) {
                    console.log(`  Has ${list.cards.length} cards.`);
                    list.cards.forEach((card: any, j) => {
                        console.log(`    Card ${j} [${card.id}]: ${card.title}`);
                        console.log(`      dueDate: ${card.dueDate} (Type: ${typeof card.dueDate})`);
                        console.log(`      Keys: ${Object.keys(card).join(', ')}`);
                    });
                } else {
                    console.log('  No cards array in list.');
                }
            });
        } else {
            console.log('Lists is not an array:', lists);
        }

        console.log('--- Top-level Cards (if any) ---');
        console.log('Cards Type:', typeof board.cards);
        // Some implementations might store cards at top level?
        if (board.cards) {
            console.log('Board has top-level cards field:', board.cards);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkBoardStructure();
