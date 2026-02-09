import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import * as fabricModule from 'fabric';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { CanvasEditorRef, LabelElement } from './types';
import type { LayoutElement, SmartLayout } from './smartLabelLayout';

const fabric = (fabricModule as any).fabric || fabricModule;

interface CanvasEditorProps {
  widthMm: number;
  heightMm: number;
  onSelectionChange?: (object: fabric.Object | null) => void;
  onCanvasChange?: () => void;
  onReady?: () => void;
}

const MM_TO_PX = 10;

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ widthMm, heightMm, onSelectionChange, onCanvasChange, onReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const hasCalledOnReady = useRef(false);
    const [canvasVersion, setCanvasVersion] = useState(0);

    useEffect(() => {
      if (!canvasRef.current) return;

      const widthPx = widthMm * MM_TO_PX;
      const heightPx = heightMm * MM_TO_PX;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: widthPx,
        height: heightPx,
        backgroundColor: '#ffffff',
        selection: true,
      });

      fabricCanvasRef.current = canvas;
      
      setCanvasVersion(v => v + 1);

      canvas.on('selection:created', (e) => {
        onSelectionChange?.(e.selected?.[0] || null);
      });

      canvas.on('selection:updated', (e) => {
        onSelectionChange?.(e.selected?.[0] || null);
      });

      canvas.on('selection:cleared', () => {
        onSelectionChange?.(null);
      });

      canvas.on('object:modified', () => {
        onCanvasChange?.();
      });

      canvas.on('object:added', () => {
        onCanvasChange?.();
      });

      canvas.on('object:removed', () => {
        onCanvasChange?.();
      });

      if (!hasCalledOnReady.current && onReady) {
        hasCalledOnReady.current = true;
        requestAnimationFrame(() => {
          onReady();
        });
      }

      return () => {
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }, [widthMm, heightMm]);

    const addText = () => {
      if (!fabricCanvasRef.current) return;

      const text = new fabric.Textbox('Texto', {
        left: 20,
        top: 20,
        width: 150,
        fontSize: 18,
        fill: '#000000',
        fontFamily: 'Arial',
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      fabricCanvasRef.current.renderAll();
    };

    const addTextWithContent = (
      content: string, 
      options?: { 
        x?: number; 
        y?: number; 
        width?: number;
        fontSize?: number; 
        fontWeight?: string;
        fontFamily?: string;
        fill?: string;
      }
    ) => {
      if (!fabricCanvasRef.current) return;

      const xPx = (options?.x || 5) * MM_TO_PX;
      const yPx = (options?.y || 5) * MM_TO_PX;
      const widthPx = options?.width ? options.width * MM_TO_PX : (widthMm - 10) * MM_TO_PX;

      const text = new fabric.Textbox(content, {
        left: xPx,
        top: yPx,
        width: widthPx,
        fontSize: options?.fontSize || 12,
        fill: options?.fill || '#000000',
        fontFamily: options?.fontFamily || 'Arial',
        fontWeight: options?.fontWeight || 'normal',
      });

      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.renderAll();
    };

    const addImage = async (file: File) => {
      if (!fabricCanvasRef.current) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        try {
          const img = await fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' });
          if (!fabricCanvasRef.current) return;

          img.set({
            left: 20,
            top: 20,
            scaleX: 0.4,
            scaleY: 0.4,
          });

          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);
          fabricCanvasRef.current.renderAll();
        } catch (error) {
          console.error('[CanvasEditor] Error adding image:', error);
        }
      };
      reader.readAsDataURL(file);
    };

    const addImageAtPosition = async (
      dataUrl: string,
      options: { x: number; y: number; width: number; height: number }
    ) => {
      if (!fabricCanvasRef.current) return;

      try {
        const img = await fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' });
        if (!fabricCanvasRef.current) return;

        const xPx = options.x * MM_TO_PX;
        const yPx = options.y * MM_TO_PX;
        const targetWidth = options.width * MM_TO_PX;
        const targetHeight = options.height * MM_TO_PX;

        const scaleX = targetWidth / (img.width || 100);
        const scaleY = targetHeight / (img.height || 100);
        const scale = Math.min(scaleX, scaleY);

        img.set({
          left: xPx,
          top: yPx,
          scaleX: scale,
          scaleY: scale,
        });

        (img as any).elementType = 'logo';

        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.renderAll();
      } catch (error) {
        console.error('[CanvasEditor] Error adding positioned image:', error);
      }
    };

    const addLogoPlaceholder = (options: { x: number; y: number; width: number; height: number }) => {
      if (!fabricCanvasRef.current) return;

      const xPx = options.x * MM_TO_PX;
      const yPx = options.y * MM_TO_PX;
      const widthPx = options.width * MM_TO_PX;
      const heightPx = options.height * MM_TO_PX;

      const rect = new fabric.Rect({
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
      });

      const text = new fabric.Text('LOGO', {
        left: widthPx / 2,
        top: heightPx / 2,
        fontSize: Math.min(widthPx, heightPx) * 0.35,
        fill: '#000000',
        fontFamily: 'Arial',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
      });

      const group = new fabric.Group([rect, text], {
        left: xPx,
        top: yPx,
      });

      (group as any).elementType = 'logoPlaceholder';
      (group as any).isPlaceholder = true;

      fabricCanvasRef.current.add(group);
      fabricCanvasRef.current.renderAll();
    };

    const addBarcode = async (text: string = 'BJ-0001', options?: { x?: number; y?: number; width?: number; height?: number }) => {
      if (!fabricCanvasRef.current) return;

      try {
        const canvas = document.createElement('canvas');
        const barcodeHeight = options?.height ? options.height * MM_TO_PX * 0.7 : 40;
        
        JsBarcode(canvas, text, {
          format: 'CODE128',
          displayValue: false,
          height: barcodeHeight,
          width: 2,
        });

        const dataUrl = canvas.toDataURL('image/png');
        
        const img = await fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' });
        if (!fabricCanvasRef.current) return;

        const xPx = options?.x ? options.x * MM_TO_PX : 20;
        const yPx = options?.y ? options.y * MM_TO_PX : 120;

        if (options?.width && options?.height) {
          const targetWidth = options.width * MM_TO_PX;
          const targetHeight = options.height * MM_TO_PX;
          const scaleX = targetWidth / (img.width || 100);
          const scaleY = targetHeight / (img.height || 50);
          const scale = Math.min(scaleX, scaleY, 1);
          
          img.set({
            left: xPx,
            top: yPx,
            scaleX: scale,
            scaleY: scale,
          });
        } else {
          img.set({
            left: xPx,
            top: yPx,
            scaleX: 1,
            scaleY: 1,
          });
        }

        (img as any).barcodeValue = text;
        (img as any).elementType = 'barcode';

        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.renderAll();
      } catch (error) {
        console.error('Error creating barcode:', error);
      }
    };

    const addQRCode = async (text: string = 'https://sua-loja.com', options?: { x?: number; y?: number; size?: number }) => {
      if (!fabricCanvasRef.current) return;

      try {
        const size = options?.size ? options.size * MM_TO_PX : 128;
        
        const dataUrl = await QRCode.toDataURL(text, {
          width: size,
          margin: 1,
        });
        
        const img = await fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' });
        if (!fabricCanvasRef.current) return;

        const xPx = options?.x ? options.x * MM_TO_PX : 120;
        const yPx = options?.y ? options.y * MM_TO_PX : 120;

        img.set({
          left: xPx,
          top: yPx,
          scaleX: 0.6,
          scaleY: 0.6,
        });

        (img as any).qrCodeValue = text;
        (img as any).elementType = 'qrcode';

        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.renderAll();
      } catch (error) {
        console.error('Error creating QR code:', error);
      }
    };

    const loadSmartLayout = async (layout: SmartLayout, companyLogoUrl?: string) => {
      if (!fabricCanvasRef.current) return;

      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';

      const textPromises: Promise<void>[] = [];
      const imagePromises: Promise<void>[] = [];

      for (const element of layout.elements) {
        switch (element.type) {
          case 'text':
            if (element.content || element.placeholder) {
              addTextWithContent(
                element.content || '...',
                {
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  fontSize: element.fontSize,
                  fontWeight: element.fontWeight,
                }
              );
            }
            break;

          case 'image':
            if (element.id === 'company-logo') {
              if (companyLogoUrl) {
                imagePromises.push(
                  addImageAtPosition(companyLogoUrl, {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                  })
                );
              } else if (element.placeholder) {
                addLogoPlaceholder({
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                });
              }
            }
            break;

          case 'barcode':
            if (element.content) {
              imagePromises.push(
                (async () => {
                  await addBarcode(element.content!, {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                  });
                })()
              );
            }
            break;
        }
      }

      await Promise.all(imagePromises);
      
      fabricCanvasRef.current.renderAll();
    };

    const deleteSelected = () => {
      if (!fabricCanvasRef.current) return;

      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (activeObject) {
        fabricCanvasRef.current.remove(activeObject);
        fabricCanvasRef.current.renderAll();
      }
    };

    const clearCanvas = () => {
      if (!fabricCanvasRef.current) return;
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      fabricCanvasRef.current.renderAll();
    };

    const getElements = (): LabelElement[] => {
      if (!fabricCanvasRef.current) return [];

      const objects = fabricCanvasRef.current.getObjects();
      const elements: LabelElement[] = [];

      objects.forEach((obj) => {
        const left = obj.left || 0;
        const top = obj.top || 0;
        const width = (obj.width || 0) * (obj.scaleX || 1);
        const height = (obj.height || 0) * (obj.scaleY || 1);

        const xMm = left / MM_TO_PX;
        const yMm = top / MM_TO_PX;
        const widthMm = width / MM_TO_PX;
        const heightMm = height / MM_TO_PX;

        if (obj.type === 'textbox' || obj.type === 'text') {
          const textbox = obj as fabric.Textbox;
          elements.push({
            type: 'text',
            text: textbox.text || '',
            x: xMm,
            y: yMm,
            width: widthMm,
            height: heightMm,
            fontSize: textbox.fontSize || 12,
            fontFamily: textbox.fontFamily || 'Arial',
            fill: textbox.fill as string || '#000000',
          });
        } else if ((obj as any).elementType === 'barcode') {
          elements.push({
            type: 'barcode',
            value: (obj as any).barcodeValue || 'BJ-0001',
            data: obj.toDataURL({ format: 'png' }),
            x: xMm,
            y: yMm,
            width: widthMm,
            height: heightMm,
          });
        } else if ((obj as any).elementType === 'qrcode') {
          elements.push({
            type: 'qrcode',
            value: (obj as any).qrCodeValue || 'https://sua-loja.com',
            data: obj.toDataURL({ format: 'png' }),
            x: xMm,
            y: yMm,
            width: widthMm,
            height: heightMm,
          });
        } else if (obj.type === 'image' || (obj as any).elementType === 'logo') {
          elements.push({
            type: 'image',
            data: obj.toDataURL({ format: 'png' }),
            x: xMm,
            y: yMm,
            width: widthMm,
            height: heightMm,
          });
        } else if ((obj as any).elementType === 'logoPlaceholder') {
        }
      });

      return elements;
    };

    const loadDesignData = (data: any) => {
      if (!fabricCanvasRef.current) return;

      fabricCanvasRef.current.loadFromJSON(data, () => {
        fabricCanvasRef.current?.renderAll();
      });
    };

    const getDesignData = () => {
      if (!fabricCanvasRef.current) return null;
      return fabricCanvasRef.current.toJSON(['barcodeValue', 'qrCodeValue', 'elementType', 'isPlaceholder']);
    };

    useImperativeHandle(ref, () => {
      return {
        canvas: fabricCanvasRef.current,
        addText,
        addTextWithContent,
        addImage,
        addImageAtPosition,
        addLogoPlaceholder,
        addBarcode,
        addQRCode,
        loadSmartLayout,
        deleteSelected,
        clearCanvas,
        getElements,
        loadDesignData,
        getDesignData,
      };
    }, [canvasVersion, widthMm, heightMm]);

    return (
      <div className="flex justify-center items-center p-4 bg-gray-100 rounded-lg">
        <div className="bg-white shadow-lg" style={{ padding: '20px' }}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    );
  }
);

CanvasEditor.displayName = 'CanvasEditor';
