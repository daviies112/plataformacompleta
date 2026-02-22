
import { storeService } from './server/services/storeService';
import dotenv from 'dotenv';

dotenv.config();

async function testFull() {
    const tenantId = 'system';
    console.log(`🧪 Testando StoreService COMPLETO para tenant: ${tenantId}`);

    try {
        // 1. Testar BENEFÍCIOS
        console.log('\n--- 🎁 Testando Salvar Benefício ---');
        const dummyBenefit = {
            icon: 'Gift',
            title: 'Benefício Teste',
            description: 'Descrição do benefício de teste',
            display_order: 1,
            is_active: true
        };
        const savedBenefit = await storeService.saveBenefit(tenantId, dummyBenefit);
        if (savedBenefit) {
            console.log('✅ Benefício salvo! ID:', savedBenefit.id);
        } else {
            console.log('❌ Falha ao salvar benefício.');
        }

        // 2. Testar VÍDEOS
        console.log('\n--- 📽️ Testando Salvar Vídeo ---');
        const dummyVideo = {
            title: 'Vídeo Teste',
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            video_type: 'url' as any,
            is_active: true
        };
        const savedVideo = await storeService.saveVideo(tenantId, dummyVideo);
        if (savedVideo) {
            console.log('✅ Vídeo salvo! ID:', savedVideo.id);
        } else {
            console.log('❌ Falha ao salvar vídeo.');
        }

        // 3. Testar MOSAICO
        console.log('\n--- 🖼️ Testando Salvar Mosaico ---');
        const dummyMosaic = {
            title: 'Mosaico Teste',
            image_url: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75',
            layout_type: '1x1' as any,
            is_active: true
        };
        const savedMosaic = await storeService.saveMosaic(tenantId, dummyMosaic);
        if (savedMosaic) {
            console.log('✅ Mosaico salvo! ID:', savedMosaic.id);
        } else {
            console.log('❌ Falha ao salvar mosaico.');
        }

        // 4. Testar CAMPANHA (Re-confirmar)
        console.log('\n--- 📅 Testando Salvar Campanha ---');
        const dummyCampaign = {
            name: 'Campanha Teste ' + new Date().toLocaleTimeString(),
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            is_active: true
        };
        const savedCampaign = await storeService.saveCampaign(tenantId, dummyCampaign);
        if (savedCampaign) {
            console.log('✅ Campanha salva! ID:', savedCampaign.id);
        } else {
            console.log('❌ Falha ao salvar campanha.');
        }

    } catch (err) {
        console.error('💥 Erro fatal no teste:', err);
    }
    process.exit();
}

testFull();
