
import { storeService } from './server/services/storeService';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    const tenantId = 'system';
    console.log(`🧪 Testando StoreService para tenant: ${tenantId}`);

    try {
        console.log('--- Testando Salvar Campanha ---');
        const dummyCampaign = {
            name: 'Teste de Conexão ' + new Date().toLocaleTimeString(),
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            is_active: true
        };

        const saved = await storeService.saveCampaign(tenantId, dummyCampaign);
        if (saved) {
            console.log('✅ Campanha salva com sucesso para SYSTEM! ID:', saved.id);
        } else {
            console.log('❌ Falha ao salvar campanha.');
        }

    } catch (err) {
        console.error('💥 Erro fatal no teste:', err);
    }
}

test();
