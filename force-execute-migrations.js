import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_OWNER_URL;
const SUPABASE_KEY = process.env.SUPABASE_OWNER_SERVICE_KEY;

console.log('🚀 Tentando executar migrations no Supabase...');
console.log('📍 URL:', SUPABASE_URL);
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeMigrations() {
  const sql = fs.readFileSync('/var/www/plataformacompleta/SUPABASE-MIGRATIONS.sql', 'utf8');

  // Abordagem 1: Tentar executar cada CREATE TABLE individualmente via REST API
  console.log('📝 Abordagem 1: Criando tabelas via REST API...\n');

  const tables = [
    {
      name: 'store_banners',
      schema: `
        id uuid primary key default gen_random_uuid(),
        tenant_id text not null,
        title text,
        subtitle text,
        description text,
        image_url text not null,
        mobile_image_url text,
        cta_text text default 'Ver Coleção',
        cta_url text,
        text_color text default '#F5F0E8',
        overlay_opacity real default 0.3,
        text_align text default 'center',
        display_order integer default 0,
        is_active boolean default true,
        created_at timestamp default now(),
        updated_at timestamp default now()
      `
    },
    {
      name: 'store_benefits',
      schema: `
        id uuid primary key default gen_random_uuid(),
        tenant_id text not null,
        icon varchar(50) not null,
        title varchar(200) not null,
        description text,
        display_order integer default 0,
        is_active boolean default true,
        created_at timestamp default now(),
        updated_at timestamp default now()
      `
    },
    {
      name: 'store_campaigns',
      schema: `
        id uuid primary key default gen_random_uuid(),
        tenant_id text not null,
        name varchar(200) not null,
        description text,
        image_url text,
        badge_text varchar(100),
        start_date date not null,
        end_date date not null,
        discount_percentage integer check (discount_percentage >= 0 and discount_percentage <= 100),
        target_product_ids uuid[],
        is_active boolean default true,
        created_at timestamp default now(),
        updated_at timestamp default now()
      `
    },
    {
      name: 'store_mosaics',
      schema: `
        id uuid primary key default gen_random_uuid(),
        tenant_id text not null,
        title varchar(200),
        image_url text not null,
        link_url text,
        layout_type varchar(10) default '1x1',
        display_order integer default 0,
        is_active boolean default true,
        created_at timestamp default now(),
        updated_at timestamp default now()
      `
    },
    {
      name: 'store_videos',
      schema: `
        id uuid primary key default gen_random_uuid(),
        tenant_id text not null,
        title varchar(200),
        description text,
        video_url text not null,
        video_type varchar(20) default 'url',
        thumbnail_url text,
        section_type varchar(50) default 'hero',
        display_order integer default 0,
        is_active boolean default true,
        autoplay boolean default false,
        created_at timestamp default now(),
        updated_at timestamp default now()
      `
    }
  ];

  let success = 0;
  let failed = 0;

  for (const table of tables) {
    try {
      // Tentar SELECT para ver se tabela existe
      const { error: selectError } = await supabase
        .from(table.name)
        .select('id')
        .limit(1);

      if (selectError && selectError.code === '42P01') {
        console.log(`⏳ Tabela ${table.name} não existe. Tentando criar...`);

        // Tabela não existe, mas não podemos criar via REST API
        // Vamos marcar como "precisa criar"
        console.log(`❌ ${table.name}: Não pode ser criada via REST API`);
        failed++;
      } else if (selectError) {
        console.log(`❌ ${table.name}: Erro - ${selectError.message}`);
        failed++;
      } else {
        console.log(`✅ ${table.name}: Já existe!`);
        success++;
      }
    } catch (err) {
      console.log(`❌ ${table.name}: Erro - ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Sucesso: ${success}/5`);
  console.log(`   ❌ Falhou: ${failed}/5\n`);

  if (failed > 0) {
    console.log('⚠️  ATENÇÃO: Não é possível criar tabelas via REST API do Supabase.');
    console.log('');
    console.log('🔧 SOLUÇÃO: Execute manualmente no SQL Editor:');
    console.log('');
    console.log('1. Acesse o Supabase Studio');
    console.log('2. Vá em SQL Editor');
    console.log('3. Cole o arquivo: /var/www/plataformacompleta/SUPABASE-MIGRATIONS.sql');
    console.log('4. Clique em RUN');
    console.log('');
  } else {
    console.log('✅ Todas as tabelas já existem! Pronto para usar.');
  }
}

executeMigrations().catch(err => {
  console.error('❌ ERRO:', err.message);
  process.exit(1);
});
