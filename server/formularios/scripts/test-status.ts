/**
 * Script para testar se o sistema de status está funcionando
 * Executa testes de normalização de telefones
 */

import { normalizePhone, extractPhoneFromWhatsAppId, phonesMatch, isValidBrazilianPhone, formatPhoneForDisplay } from '../utils/phoneNormalizer.js';

console.log('🧪 TESTE DE NORMALIZAÇÃO DE TELEFONES\n');
console.log('=' .repeat(60));

// Telefones de teste (formato do Evolution API e outros)
const testPhones = [
  '5531999972368@s.whatsapp.net',  // Formato WhatsApp
  '5533766857244@s.whatsapp.net',  // Tati
  '31999999999',                    // Formato sem código país
  '+5531888888888',                 // Formato com +
  '(31) 99997-2368',                // Formato brasileiro
  '553187089883',                   // Apenas números com código país
];

console.log('\n📱 TESTE 1: Normalização Individual\n');

testPhones.forEach((phone, index) => {
  console.log(`${index + 1}. Testando: ${phone}`);
  
  const normalized = normalizePhone(phone);
  console.log(`   ✅ Normalizado: ${normalized}`);
  
  const valid = isValidBrazilianPhone(phone);
  console.log(`   📋 Válido: ${valid ? '✅ SIM' : '❌ NÃO'}`);
  
  const formatted = formatPhoneForDisplay(phone);
  console.log(`   📞 Formatado: ${formatted}`);
  
  console.log('');
});

// Teste de comparação
console.log('=' .repeat(60));
console.log('\n🔄 TESTE 2: Comparação de Telefones\n');

const phone1 = '5531999999999@s.whatsapp.net';
const phone2 = '+5531999999999';
const phone3 = '31999999999';
const phone4 = '(31) 99999-9999';

console.log(`Phone 1: ${phone1}`);
console.log(`Phone 2: ${phone2}`);
console.log(`Phone 3: ${phone3}`);
console.log(`Phone 4: ${phone4}`);
console.log('');

console.log(`Phone1 === Phone2? ${phonesMatch(phone1, phone2) ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
console.log(`Phone1 === Phone3? ${phonesMatch(phone1, phone3) ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
console.log(`Phone2 === Phone3? ${phonesMatch(phone2, phone3) ? '✅ IGUAIS' : '❌ DIFERENTES'}`);
console.log(`Phone1 === Phone4? ${phonesMatch(phone1, phone4) ? '✅ IGUAIS' : '❌ DIFERENTES'}`);

// Teste de extração de WhatsApp ID
console.log('\n' + '='.repeat(60));
console.log('\n📲 TESTE 3: Extração de WhatsApp ID\n');

const whatsappIds = [
  '5531999972368@s.whatsapp.net',
  '553187089883@c.us',
  '553199306254@s.whatsapp.net',
];

whatsappIds.forEach((id, index) => {
  console.log(`${index + 1}. WhatsApp ID: ${id}`);
  const extracted = extractPhoneFromWhatsAppId(id);
  console.log(`   ✅ Telefone extraído: ${extracted}`);
  console.log('');
});

// Teste de validação
console.log('=' .repeat(60));
console.log('\n✔️ TESTE 4: Validação de Telefones Brasileiros\n');

const validationTests = [
  { phone: '+5531999999999', expected: true },
  { phone: '31999999999', expected: true },
  { phone: '+5531888888888', expected: true },
  { phone: '+5511987654321', expected: true },
  { phone: '11987654321', expected: true },
  { phone: '+1234567890', expected: false },  // Não brasileiro
  { phone: '31812345678', expected: false },  // Não começa com 9
  { phone: '99999999', expected: false },     // Muito curto
];

validationTests.forEach(({ phone, expected }) => {
  const result = isValidBrazilianPhone(phone);
  const status = result === expected ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`${status} - ${phone} (esperado: ${expected ? 'válido' : 'inválido'}, obtido: ${result ? 'válido' : 'inválido'})`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✅ TESTES CONCLUÍDOS!\n');
console.log('💡 Para testar os endpoints da API, execute:');
console.log('   curl http://localhost:5000/api/leads/status/31999999999');
console.log('   curl http://localhost:5000/api/leads/whatsapp-status\n');
