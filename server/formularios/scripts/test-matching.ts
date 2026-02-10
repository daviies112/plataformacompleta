import { db } from '../db.js';
import { leads } from "../../../shared/db-schema";
import { normalizePhone, extractPhoneFromWhatsAppId, phonesMatch } from '../utils/phoneNormalizer.js';
import { normalizarTelefone } from '../utils/phone.js';

console.log('\n🧪 =====================================');
console.log('🧪 TESTE DE MATCHING DE TELEFONES');
console.log('🧪 =====================================\n');

async function testMatching() {
  try {
    // 1. TESTAR NORMALIZAÇÃO
    console.log('📞 1. TESTE DE NORMALIZAÇÃO\n');
    
    const testCases = [
      '31999972368',
      '5531999972368',
      '+5531999972368',
      '+55 31 99997-2368',
      '(31) 99997-2368',
      '5531999972368@s.whatsapp.net',
    ];
    
    testCases.forEach(testPhone => {
      const normalized1 = normalizePhone(testPhone);
      const normalized2 = normalizarTelefone(testPhone);
      console.log(`   Input: ${testPhone}`);
      console.log(`   → normalizePhone(): ${normalized1}`);
      console.log(`   → normalizarTelefone(): ${normalized2}`);
      console.log(`   → Match: ${normalized1 === normalized2 ? '✅' : '❌'}\n`);
    });
    
    // 2. TESTAR EXTRAÇÃO DE WHATSAPP ID
    console.log('\n📱 2. TESTE DE EXTRAÇÃO DE WHATSAPP ID\n');
    
    const whatsappId = '5531999972368@s.whatsapp.net';
    const extracted = extractPhoneFromWhatsAppId(whatsappId);
    console.log(`   WhatsApp ID: ${whatsappId}`);
    console.log(`   → Extraído: ${extracted}\n`);
    
    // 3. TESTAR COMPARAÇÃO
    console.log('\n🔄 3. TESTE DE COMPARAÇÃO\n');
    
    const phone1 = '31999972368';
    const phone2 = '5531999972368@s.whatsapp.net';
    const match = phonesMatch(phone1, phone2);
    console.log(`   Telefone 1: ${phone1}`);
    console.log(`   Telefone 2: ${phone2}`);
    console.log(`   → Match: ${match ? '✅ SIM' : '❌ NÃO'}\n`);
    
    // 4. LISTAR LEADS DO BANCO
    console.log('\n🗄️ 4. LEADS NO BANCO DE DADOS\n');
    
    const allLeads = await db.select().from(leads);
    
    if (allLeads.length === 0) {
      console.log('   ⚠️ Nenhum lead encontrado no banco!\n');
    } else {
      console.log(`   📊 Total de leads: ${allLeads.length}\n`);
      
      allLeads.forEach((lead, index) => {
        console.log(`   ${index + 1}. Lead ID: ${lead.id}`);
        console.log(`      Nome: ${lead.nome || 'N/A'}`);
        console.log(`      Telefone: ${lead.telefone}`);
        console.log(`      Telefone Normalizado: ${lead.telefoneNormalizado}`);
        console.log(`      WhatsApp ID: ${lead.whatsappId || 'N/A'}`);
        console.log(`      Form Status: ${lead.formStatus || 'N/A'}`);
        console.log(`      Qualification: ${lead.qualificationStatus || 'N/A'}`);
        console.log(`      Pontuação: ${lead.pontuacao ?? 'N/A'}`);
        console.log();
      });
    }
    
    // 5. TESTAR MATCHING COM LEADS DO BANCO
    console.log('\n🎯 5. TESTE DE MATCHING COM BANCO\n');
    
    if (allLeads.length > 0) {
      const testLead = allLeads[0];
      const whatsappFormat = testLead.telefoneNormalizado.replace('+', '') + '@s.whatsapp.net';
      
      console.log(`   Testando matching com lead: ${testLead.nome || testLead.telefoneNormalizado}`);
      console.log(`   Telefone no banco: ${testLead.telefoneNormalizado}`);
      console.log(`   Simulando WhatsApp: ${whatsappFormat}`);
      
      const normalized = normalizePhone(whatsappFormat);
      const matches = normalized === testLead.telefoneNormalizado;
      
      console.log(`   → Normalizado: ${normalized}`);
      console.log(`   → Match: ${matches ? '✅ SIM' : '❌ NÃO'}`);
      
      if (matches) {
        console.log('\n   ✅ SUCESSO! O matching está funcionando corretamente!\n');
      } else {
        console.log('\n   ❌ ERRO! O matching NÃO está funcionando!\n');
      }
    }
    
    console.log('\n🧪 =====================================');
    console.log('🧪 TESTE CONCLUÍDO');
    console.log('🧪 =====================================\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    process.exit(1);
  }
}

testMatching();
