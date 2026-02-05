module.exports = {
  apps: [{
    name: "plataforma",
    script: "dist/index.mjs",
    env: {
      NODE_ENV: "production",
      PORT: "5000",
      DATABASE_URL: "postgresql://postgres.qvcsyhdgfeseyehfqcff:230723Davi%23b@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
      SUPABASE_OWNER_URL: "https://fsojiujwjfseqwrqesch.supabase.co",
      SUPABASE_OWNER_KEY: "$MINHA_SERVICE_ROLE",
      CREDENTIALS_ENCRYPTION_KEY_BASE64: "c3PJEj6OdmRNaWR4DPNgPTttB6gWG0DfnkmKmzEuT+4=",
      SESSION_SECRET: "KpJecdjBubFMJiq8k680KB+0yyjGTXWtSNu4/Ay1nuIlEC3RlbxMmTpZG2V2BGWBLr9RMMomozPxN",
      JWT_SECRET: "230723Davi#b"
    }
  }]
}
