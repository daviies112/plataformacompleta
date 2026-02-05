import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './shared/db-schema.ts',
  out: './migrations',
  tablesFilter: ["!admins", "!sessoes", "!logs_acesso"],
  dbCredentials: {
    url: "postgresql://postgres.qvcsyhdgfeseyehfqcff:230723Davi%23b@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
  },
});
