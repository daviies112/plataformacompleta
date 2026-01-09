import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function checkN8nTable() {
  // Read config file
  const configPath = './data/supabase-config.json';
  if (!fs.existsSync(configPath)) {
    console.error('Config file not found');
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabaseAnonKey;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  console.log('Connecting to Supabase:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Try to fetch a sample from n8n_chat_histories
  console.log('\n=== Checking n8n_chat_histories table ===');
  const { data, error } = await supabase
    .from('n8n_chat_histories')
    .select('*')
    .limit(3);
    
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Sample data:', JSON.stringify(data, null, 2));
    if (data && data.length > 0) {
      console.log('\n=== Column names ===');
      console.log(Object.keys(data[0]));
    }
  }
  
  // Also check count
  const { count, error: countError } = await supabase
    .from('n8n_chat_histories')
    .select('*', { count: 'exact', head: true });
    
  if (!countError) {
    console.log('\nTotal records:', count);
  }
}

checkN8nTable();
