import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function tenantIdToUUID(tenantId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(tenantId)) {
    return tenantId;
  }
  const hash = crypto.createHash('sha256').update(tenantId).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

const MASTER_URL = process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
  console.log('❌ Supabase Master not configured');
  process.exit(1);
}

const supabase = createClient(MASTER_URL, MASTER_KEY);

const systemTenantId = tenantIdToUUID('system');
const targetTenantId = tenantIdToUUID('dev-daviemericko_gmail_com');

console.log('📦 Migrating tenant records...');
console.log('From tenant:', systemTenantId);
console.log('To tenant:', targetTenantId);

async function migrate() {
  const { data: checks, error: fetchError } = await supabase
    .from('datacorp_checks')
    .select('id, person_name, tenant_id')
    .eq('tenant_id', systemTenantId);
  
  if (fetchError) {
    console.error('❌ Error fetching:', fetchError);
    return;
  }
  
  console.log('\n📋 Found records to migrate:', checks?.length || 0);
  if (checks && checks.length > 0) {
    checks.forEach(c => console.log('  -', c.person_name || 'Sem nome'));
  }
  
  if (!checks || checks.length === 0) {
    console.log('✅ No records to migrate');
    return;
  }
  
  const { data: updateResult, error: updateError } = await supabase
    .from('datacorp_checks')
    .update({ tenant_id: targetTenantId })
    .eq('tenant_id', systemTenantId)
    .select('id');
  
  if (updateError) {
    console.error('❌ Error updating:', updateError);
    return;
  }
  
  console.log('\n✅ Successfully migrated:', updateResult?.length || 0, 'records');
}

migrate();
