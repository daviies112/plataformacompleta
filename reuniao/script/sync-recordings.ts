
import { db } from "../server/db";
import { gravacoes, tenants } from "@shared/schema";
import { eq, or, and } from "drizzle-orm";
import { obterGravacao } from "../server/services/hms100ms";

async function syncRecordings() {
  console.log("🔄 Iniciando sincronização de gravações...");

  try {
    // 1. Buscar gravações que podem estar travadas (recording ou processing)
    const pendingRecordings = await db
      .select({
        gravacao: gravacoes,
        tenant: tenants,
      })
      .from(gravacoes)
      .leftJoin(tenants, eq(gravacoes.tenantId, tenants.id))
      .where(
        or(
          eq(gravacoes.status, "recording"),
          eq(gravacoes.status, "processing")
        )
      );

    console.log(`🔍 Encontradas ${pendingRecordings.length} gravações pendentes.`);

    for (const { gravacao, tenant } of pendingRecordings) {
      if (!tenant) {
        console.warn(`⚠️ Tenant não encontrado para gravação ${gravacao.id}. Pulando.`);
        continue;
      }
      
      if (!gravacao.recordingId100ms) {
         console.warn(`⚠️ Gravação ${gravacao.id} sem recordingId100ms. Pulando.`);
         continue;
      }

      const appAccessKey = tenant.appAccessKey || process.env.HMS_APP_ACCESS_KEY;
      const appSecret = tenant.appSecret || process.env.HMS_APP_SECRET;

      if (!appAccessKey || !appSecret) {
        console.error(`❌ Credenciais ausentes para o tenant ${tenant.slug}.`);
        continue;
      }

      console.log(`📡 Verificando status no 100ms para gravação ${gravacao.id} (ID 100ms: ${gravacao.recordingId100ms})...`);

      try {
        const hmsData = await obterGravacao(gravacao.recordingId100ms, appAccessKey, appSecret);
        
        // Mapear status do 100ms para o nosso status
        // 100ms status: starting, running, stopped, uploading, completed, failed
        console.log(`   Status atual no 100ms: ${hmsData.status}`);

        let newStatus = gravacao.status;
        let fileUrl = gravacao.fileUrl;
        let fileSize = gravacao.fileSize;
        let duration = gravacao.duration;

        if (hmsData.status === "completed" && hmsData.assets && hmsData.assets.length > 0) {
           // Pegar o asset de vídeo/composto
           const asset = hmsData.assets.find((a: any) => a.type === "composite" || a.type === "chat-composite" || a.type === "mp4");
           
           if (asset) {
             newStatus = "completed";
             fileUrl = asset.location;
             fileSize = asset.size;
             duration = asset.duration;
           }
        } else if (hmsData.status === "failed") {
          newStatus = "failed";
        }

        // Se houve mudança ou se queremos garantir a URL
        if (newStatus !== gravacao.status || (newStatus === 'completed' && !gravacao.fileUrl)) {
           console.log(`💾 Atualizando banco de dados: ${gravacao.status} -> ${newStatus}`);
           
           await db.update(gravacoes)
             .set({
               status: newStatus,
               fileUrl: fileUrl,
               fileSize: fileSize,
               duration: duration,
               updatedAt: new Date()
             })
             .where(eq(gravacoes.id, gravacao.id));
             
           console.log(`✅ Gravação ${gravacao.id} atualizada com sucesso!`);
        } else {
           console.log(`ℹ️ Nenhuma alteração necessária.`);
        }

      } catch (err: any) {
        console.error(`❌ Erro ao consultar 100ms para gravação ${gravacao.id}:`, err.message);
      }
    }

    console.log("🏁 Sincronização finalizada.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Erro fatal no script:", error);
    process.exit(1);
  }
}

syncRecordings();
