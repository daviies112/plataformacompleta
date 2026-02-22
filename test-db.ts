import 'dotenv/config';
import { db } from './server/db';
import { workspacePublicMapping } from './shared/db-schema';

async function test() {
    console.log('Inserting test token...');
    try {
        await db.insert(workspacePublicMapping).values({
            id: 'test_token_123',
            itemId: 'test_item_id',
            itemType: 'page',
            tenantId: 'system',
            isActive: true
        }).onConflictDoUpdate({
            target: workspacePublicMapping.id,
            set: { updatedAt: new Date() }
        });
        console.log('Successfully inserted/updated test token');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

test();
