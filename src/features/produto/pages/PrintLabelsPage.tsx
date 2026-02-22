import { useEffect, useState, useRef } from 'react';
import JsBarcode from 'jsbarcode';

import { LABEL_SIZES } from "@/features/produto/types/printer.types";

interface PrintQueue {
    model: string;
    startPosition: number;
    showLogo: boolean;
    products: any[];
}

const PrintLabelsPage = () => {
    const [queue, setQueue] = useState<PrintQueue | null>(null);
    const [logoConfig, setLogoConfig] = useState<any>(null);

    useEffect(() => {
        const data = localStorage.getItem('print_queue');
        if (data) {
            setQueue(JSON.parse(data));
        }
        const logoData = localStorage.getItem('printer_logo_config');
        if (logoData) {
            setLogoConfig(JSON.parse(logoData));
        }
    }, []);

    if (!queue) return <div className="p-10 text-center font-sans">Carregando fila de impressão...</div>;

    // Gerar lista total de etiquetas incluindo espaços vazios
    const totalLabels: any[] = [];

    // Adicionar espaços vazios (Skip) para pular etiquetas já usadas
    for (let i = 1; i < queue.startPosition; i++) {
        totalLabels.push({ isSkip: true });
    }

    // Adicionar produtos conforme as cópias solicitadas
    queue.products.forEach(product => {
        for (let i = 0; i < (product.copies || 1); i++) {
            totalLabels.push({ ...product, isSkip: false });
        }
    });

    return (
        <div className="bg-white min-h-screen text-black font-sans print:p-0">
            <div className="no-print p-4 bg-gray-100 border-b flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="font-bold text-lg">Visualização de Impressão Jueri</h1>
                    <p className="text-xs text-gray-600">Modelo: {queue.model} | {totalLabels.length} etiquetas na fila</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">
                        Recarregar
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold shadow-md hover:bg-green-700 transition-colors">
                        Imprimir Agora
                    </button>
                </div>
            </div>

            <div className={`print-container model-${queue.model.replace(/[^a-zA-Z0-9]/g, '_')}`}>
                {totalLabels.map((item, index) => (
                    <div key={index} className={`label-item ${item.isSkip ? 'skip' : ''}`}>
                        {!item.isSkip && (
                            <LabelContent
                                item={item}
                                model={queue.model}
                                showLogo={queue.showLogo}
                                logoConfig={logoConfig}
                            />
                        )}
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media screen {
          .print-container {
            padding: 40px;
            display: grid;
            gap: 2px;
            background: #e5e7eb;
            width: fit-content;
            margin: 20px auto;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .label-item {
            background: white;
            border: 1px dashed #d1d5db;
            position: relative;
          }
          .label-item.skip {
            background: #f3f4f6;
            opacity: 0.5;
            background-image: repeating-linear-gradient(45deg, #ddd 0, #ddd 1px, transparent 0, transparent 50%);
            background-size: 10px 10px;
          }
        }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .print-container { 
            display: grid !important; 
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .label-item { border: none !important; }
          @page { margin: 0; }
        }

        /* CONFIGURAÇÕES DE GRADE POR MOLDES ESPECÍFICOS */
        
        /* 92MMX10MM / 90MMX12MM (Etiqueta de Anel/Fina) */
        .model-92MMX10MM, .model-90MMX12MM, .model-SLP_JEWEL {
          grid-template-columns: 1fr;
          width: 90mm;
        }
        .model-92MMX10MM .label-item { width: 92mm; height: 10mm; }
        .model-90MMX12MM .label-item { width: 90mm; height: 12mm; }

        /* 25MMx13MMx2 / 25MMx10MMx2 (2 por linha) */
        .model-25MMx13MMx2, .model-25MMx10MMx2, .model-29MMx11MMx2 {
          grid-template-columns: repeat(2, 1fr);
          width: calc(25mm * 2 + 3mm); /* Aproximado com gap */
          gap: 2mm;
        }
        .model-25MMx13MMx2 .label-item { width: 25mm; height: 13mm; }
        .model-25MMx10MMx2 .label-item { width: 25mm; height: 10mm; }

        /* Retangulares Avulsas */
        .model-26MMx14MM .label-item { width: 26mm; height: 14mm; }
        .model-30MMx20MM .label-item { width: 30mm; height: 20mm; }
        .model-33MMx21MM .label-item { width: 33mm; height: 21mm; }
        .model-37MMx14MM .label-item { width: 37mm; height: 14mm; }

        /* Pimaco 126 (Exemplo de Grade 4x) */
        .model-126_pimaco {
          grid-template-columns: repeat(4, 1fr);
          width: 210mm; /* A4 */
        }
      `}} />
        </div>
    );
};

const LabelContent = ({ item, model, showLogo, logoConfig }: any) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    // Default font sizes
    const titleFontSize = logoConfig?.titleFontSize ? `${logoConfig.titleFontSize}pt` : '9pt';
    const priceFontSize = logoConfig?.priceFontSize ? `${logoConfig.priceFontSize}pt` : '12pt';
    const codeFontSize = logoConfig?.codeFontSize ? `${logoConfig.codeFontSize}pt` : '8pt';

    const getLabelDimensions = (sizeValue: string) => {
        const size = LABEL_SIZES.find(s => s.value === sizeValue);
        if (size) {
            return { widthMm: size.widthMm, heightMm: size.heightMm };
        }
        // Fallback or parse if not found
        // Trying to match rough dimensions from model name if not in list
        if (model.includes('90MM')) return { widthMm: 90, heightMm: 12 };
        if (model.includes('92MM')) return { widthMm: 92, heightMm: 10 };

        return { widthMm: 60, heightMm: 40 };
    };

    const dimensions = getLabelDimensions(model);

    useEffect(() => {
        if (barcodeRef.current && item.barcode) {
            const isRetangular = model.toLowerCase().includes('retangular') || model.includes('x');
            JsBarcode(barcodeRef.current, item.barcode, {
                format: "CODE128",
                width: 1.2,
                height: isRetangular ? 15 : 25,
                displayValue: false,
                margin: 0
            });
        }
    }, [item.barcode, model]);

    const LogoOverlay = () => {
        if (!showLogo || !logoConfig || !logoConfig.showLogo || !logoConfig.logoBase64) return null;

        return (
            <img
                src={logoConfig.logoBase64}
                alt="Logo"
                style={{
                    position: 'absolute',
                    left: `${(logoConfig.logoX / (dimensions.widthMm || 1)) * 100}%`,
                    top: `${(logoConfig.logoY / (dimensions.heightMm || 1)) * 100}%`,
                    width: `${(logoConfig.logoWidth / (dimensions.widthMm || 1)) * 100}%`,
                    height: `${(logoConfig.logoHeight / (dimensions.heightMm || 1)) * 100}%`,
                    opacity: logoConfig.logoOpacity,
                    objectFit: 'contain',
                    zIndex: 20,
                    pointerEvents: 'none'
                }}
            />
        );
    };

    // Lógica de Layout para Etiquetas Finas (Anel/Borboleta)
    if (model.includes('92MM') || model.includes('90MM') || model.includes('JEWEL')) {
        return (
            <div className="flex h-full w-full items-center px-[2mm] text-black overflow-hidden bg-white relative">
                <LogoOverlay />
                <div className="flex-[4] flex flex-col justify-center items-center overflow-hidden">
                    <svg ref={barcodeRef} className="max-w-full max-h-[8mm]"></svg>
                    <span className="font-mono leading-none mt-0.5" style={{ fontSize: codeFontSize }}>{item.barcode}</span>
                </div>
                <div className="w-[12mm] border-x border-gray-100 h-[60%] border-dashed"></div>
                <div className="flex-[6] flex flex-col justify-center leading-tight pl-2">
                    <p className="font-bold truncate uppercase" style={{ fontSize: titleFontSize }}>{item.description}</p>
                    <div className="flex justify-between items-baseline mt-0.5">
                        <span className="font-mono opacity-80" style={{ fontSize: codeFontSize }}>{item.reference}</span>
                        <span className="font-black" style={{ fontSize: priceFontSize }}>{item.price}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Layout padrão para Retangulares/Tags
    return (
        <div className="h-full w-full flex flex-col items-center justify-between py-[1mm] px-[1mm] text-black bg-white overflow-hidden relative">
            <LogoOverlay />
            <p className="font-bold text-center leading-[1.1] truncate w-full" style={{ fontSize: titleFontSize }}>{item.description}</p>
            <div className="flex flex-col items-center w-full">
                <svg ref={barcodeRef} className="max-w-[95%] max-h-[10mm]"></svg>
                <span className="font-mono mt-0.5" style={{ fontSize: codeFontSize }}>{item.barcode}</span>
            </div>
            <div className="flex justify-between w-full items-center border-t border-gray-100 pt-0.5">
                <span className="font-medium opacity-70" style={{ fontSize: codeFontSize }}>{item.reference}</span>
                <span className="font-black" style={{ fontSize: priceFontSize }}>{item.price}</span>
            </div>
        </div>
    );
};

export default PrintLabelsPage;
