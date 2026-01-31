import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { log } from '../production';

const router = Router();

// Obter QR Code do cliente
router.get('/qrcode', async (req: Request, res: Response) => {
  try {
    const tenantId = req.session?.tenantId;
    // @ts-ignore - clientId é adicionado pelo middleware authenticateConfig
    const clientId = req.clientId || '1';

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'TenantId não encontrado na sessão'
      });
    }

    log(`[WhatsApp] Buscando QR Code para tenant ${tenantId}, cliente ${clientId}`);

    // Buscar QR Code do banco de dados
    const result = await db.execute(sql`
      SELECT qr_code_data, updated_at
      FROM whatsapp_qr_codes
      WHERE client_id = ${clientId}
        AND tenant_id = ${tenantId}
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        qrCodeUrl: null,
        message: 'Nenhum QR Code encontrado' 
      });
    }

    const qrCode = result.rows[0] as any;

    res.json({
      success: true,
      qrCodeUrl: qrCode.qr_code_data,
      updatedAt: qrCode.updated_at
    });
  } catch (error: any) {
    log(`[WhatsApp] Erro ao buscar QR Code: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar QR Code',
      details: error.message
    });
  }
});

// Salvar/Atualizar QR Code do cliente
router.post('/qrcode', async (req: Request, res: Response) => {
  try {
    const tenantId = req.session?.tenantId;
    const { qrCodeData, clientId } = req.body;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'TenantId não encontrado na sessão'
      });
    }

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        error: 'QR Code não fornecido'
      });
    }

    // Usar clientId do body ou do middleware
    // @ts-ignore
    const finalClientId = clientId || req.clientId || '1';

    log(`[WhatsApp] Salvando QR Code para tenant ${tenantId}, cliente ${finalClientId}`);

    // Verificar se já existe um QR Code para este cliente e tenant
    const existing = await db.execute(sql`
      SELECT id FROM whatsapp_qr_codes
      WHERE client_id = ${finalClientId}
        AND tenant_id = ${tenantId}
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      // Atualizar existente
      await db.execute(sql`
        UPDATE whatsapp_qr_codes
        SET qr_code_data = ${qrCodeData},
            updated_at = NOW()
        WHERE client_id = ${finalClientId}
          AND tenant_id = ${tenantId}
      `);

      log(`[WhatsApp] QR Code atualizado para tenant ${tenantId}, cliente ${finalClientId}`);
    } else {
      // Inserir novo
      await db.execute(sql`
        INSERT INTO whatsapp_qr_codes (tenant_id, client_id, qr_code_data)
        VALUES (${tenantId}, ${finalClientId}, ${qrCodeData})
      `);

      log(`[WhatsApp] QR Code criado para tenant ${tenantId}, cliente ${finalClientId}`);
    }

    res.json({
      success: true,
      message: 'QR Code salvo com sucesso'
    });
  } catch (error: any) {
    log(`[WhatsApp] Erro ao salvar QR Code: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar QR Code',
      details: error.message
    });
  }
});

// Deletar QR Code do cliente
router.delete('/qrcode', async (req: Request, res: Response) => {
  try {
    const tenantId = req.session?.tenantId;
    // @ts-ignore
    const clientId = req.clientId || '1';

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'TenantId não encontrado na sessão'
      });
    }

    log(`[WhatsApp] Deletando QR Code para tenant ${tenantId}, cliente ${clientId}`);

    await db.execute(sql`
      DELETE FROM whatsapp_qr_codes
      WHERE client_id = ${clientId}
        AND tenant_id = ${tenantId}
    `);

    res.json({
      success: true,
      message: 'QR Code removido com sucesso'
    });
  } catch (error: any) {
    log(`[WhatsApp] Erro ao deletar QR Code: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar QR Code',
      details: error.message
    });
  }
});

export default router;
