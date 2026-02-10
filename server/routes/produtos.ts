import { Router } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// POST /api/produtos/import-with-images
// Importa produtos do Excel e faz match com imagens do ZIP usando código de barras
router.post('/import-with-images',
    authenticateToken,
    upload.fields([
        { name: 'excel', maxCount: 1 },
        { name: 'images', maxCount: 1 }
    ]),
    async (req, res) => {
        const tempFiles: string[] = [];
        let tempDir: string | null = null;

        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const excelFile = files['excel']?.[0];
            const zipFile = files['images']?.[0];

            if (!excelFile || !zipFile) {
                return res.status(400).json({
                    success: false,
                    error: 'Arquivos faltando. Envie o Excel e o ZIP com as imagens.'
                });
            }

            tempFiles.push(excelFile.path, zipFile.path);

            console.log('📦 [Import] Iniciando importação de produtos com imagens');
            console.log(`📄 Excel: ${excelFile.originalname}`);
            console.log(`🗜️ ZIP: ${zipFile.originalname}`);

            // 1. Processar Excel
            const workbook = XLSX.readFile(excelFile.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const excelData = XLSX.utils.sheet_to_json(worksheet);

            console.log(`📊 [Import] ${excelData.length} produtos encontrados no Excel`);

            if (excelData.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Excel vazio ou formato inválido'
                });
            }

            // 2. Extrair ZIP
            const zip = new AdmZip(zipFile.path);
            tempDir = path.join('uploads', `temp-images-${Date.now()}`);

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            zip.extractAllTo(tempDir, true);
            console.log(`🗂️ [Import] ZIP extraído para ${tempDir}`);

            // 3. Mapear imagens por código de barras
            const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []): string[] => {
                const files = fs.readdirSync(dirPath);

                files.forEach((file) => {
                    const fullPath = path.join(dirPath, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
                    } else {
                        arrayOfFiles.push(fullPath);
                    }
                });

                return arrayOfFiles;
            };

            const allImageFiles = getAllFiles(tempDir);
            const imageMap = new Map<string, string>();

            allImageFiles.forEach((filePath) => {
                const filename = path.basename(filePath);
                const barcode = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');

                // Armazenar apenas se for um arquivo de imagem válido
                if (/\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
                    imageMap.set(barcode, filePath);
                }
            });

            console.log(`🖼️ [Import] ${imageMap.size} imagens mapeadas por código de barras`);

            // 4. Processar produtos e fazer upload de imagens para Supabase
            const { getSupabaseCredentials } = await import('../lib/credentialsDb');
            const supabaseCreds = await getSupabaseCredentials();

            let supabase = null;
            if (supabaseCreds?.url && supabaseCreds?.anon_key) {
                const { createClient } = await import('@supabase/supabase-js');
                supabase = createClient(supabaseCreds.url, supabaseCreds.anon_key);
                console.log('✅ [Import] Supabase configurado para upload de imagens');
            } else {
                console.warn('⚠️ [Import] Supabase não configurado - imagens não serão armazenadas');
            }

            const products = [];
            let imagesMatched = 0;
            let imagesUploaded = 0;

            for (let i = 0; i < excelData.length; i++) {
                const row: any = excelData[i];
                const barcode = String(
                    row['Código de Barras'] ||
                    row['Cód. de Barras'] ||
                    row['Codigo de Barras'] ||
                    row['barcode'] ||
                    ''
                ).trim();

                let imageUrl: string | null = null;

                // Tentar encontrar imagem correspondente
                if (barcode && imageMap.has(barcode)) {
                    imagesMatched++;
                    const imagePath = imageMap.get(barcode)!;

                    // Upload para Supabase se configurado
                    if (supabase) {
                        try {
                            const imageBuffer = fs.readFileSync(imagePath);
                            const fileExt = path.extname(imagePath);
                            const fileName = `${barcode}${fileExt}`;

                            const { data, error } = await supabase.storage
                                .from('product-images')
                                .upload(fileName, imageBuffer, {
                                    contentType: `image/${fileExt.replace('.', '')}`,
                                    upsert: true
                                });

                            if (!error && data) {
                                const { data: urlData } = supabase.storage
                                    .from('product-images')
                                    .getPublicUrl(fileName);

                                imageUrl = urlData.publicUrl;
                                imagesUploaded++;
                            } else {
                                console.error(`❌ [Import] Erro ao fazer upload da imagem ${fileName}:`, error);
                            }
                        } catch (uploadError) {
                            console.error(`❌ [Import] Exceção ao fazer upload da imagem para ${barcode}:`, uploadError);
                        }
                    } else {
                        // Se não tem Supabase, usar caminho local (fallback)
                        imageUrl = `/uploads/product-images/${barcode}${path.extname(imagePath)}`;
                    }
                }

                products.push({
                    id: String(Date.now() + i),
                    barcode: barcode,
                    reference: row['Referência'] || row['reference'] || '',
                    description: row['Descrição'] || row['description'] || '',
                    number: row['Número'] || row['Nº'] || row['number'] || '',
                    color: row['Cor'] || row['color'] || '',
                    category: row['Categoria'] || row['category'] || '',
                    subcategory: row['Subcategoria'] || row['subcategory'] || '',
                    price: row['Preço'] || row['price'] || 'R$ 0,00',
                    stock: Number(row['Estoque'] || row['stock'] || 0),
                    image: imageUrl || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100&h=100&fit=crop',
                    createdAt: new Date()
                });

                // Log de progresso a cada 100 produtos
                if ((i + 1) % 100 === 0) {
                    console.log(`⏳ [Import] Processados ${i + 1}/${excelData.length} produtos...`);
                }
            }

            console.log(`✅ [Import] Importação concluída!`);
            console.log(`📦 Total de produtos: ${products.length}`);
            console.log(`🖼️ Imagens encontradas: ${imagesMatched}`);
            console.log(`☁️ Imagens enviadas para Supabase: ${imagesUploaded}`);

            res.json({
                success: true,
                imported: products.length,
                imagesMatched: imagesMatched,
                imagesUploaded: imagesUploaded,
                products: products
            });

        } catch (error: any) {
            console.error('❌ [Import] Erro ao processar importação:', error);
            res.status(500).json({
                success: false,
                error: `Erro ao processar importação: ${error.message}`
            });
        } finally {
            // Limpar arquivos temporários
            tempFiles.forEach((file) => {
                try {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                    }
                } catch (err) {
                    console.error(`⚠️ [Import] Erro ao deletar arquivo temporário ${file}:`, err);
                }
            });

            if (tempDir && fs.existsSync(tempDir)) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (err) {
                    console.error(`⚠️ [Import] Erro ao deletar diretório temporário ${tempDir}:`, err);
                }
            }
        }
    }
);

export default router;
