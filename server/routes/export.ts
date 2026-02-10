import { Router } from 'express';
import { exportService } from '../services/exportService';

const router = Router();

router.get('/tables', async (req, res) => {
  try {
    const tables = await exportService.getAvailableTables();
    res.json({ success: true, tables });
  } catch (error) {
    console.error('Error getting available tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available tables',
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await exportService.getTableStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting table stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get table statistics',
    });
  }
});

router.post('/data', async (req, res) => {
  try {
    const { tables, format, includeMetadata } = req.body;

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Você deve selecionar pelo menos uma tabela para exportar',
      });
    }

    if (!format || !['json', 'excel'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido. Use "json" ou "excel"',
      });
    }

    const result = await exportService.exportData({
      tables,
      format,
      includeMetadata: includeMetadata !== false,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.json(result.data);
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao exportar dados',
    });
  }
});

export const exportRoutes = router;
