import { useCallback } from 'react';

export interface ImageQualityMetrics {
  brightness: number;
  contrast: number;
  sharpness: number;
  overallQuality: number;
  issues: string[];
  suggestions: string[];
}

export const useImagePreprocessing = () => {
  const analyzeImageQuality = useCallback((imageData: string): Promise<ImageQualityMetrics> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ brightness: 0.5, contrast: 0.5, sharpness: 0.5, overallQuality: 50, issues: [], suggestions: [] });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        const issues: string[] = [];
        const suggestions: string[] = [];

        let totalBrightness = 0;
        let pixelCount = 0;
        const brightnessSamples: number[] = [];
        let darkPixels = 0;
        let brightPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += luminance;
          brightnessSamples.push(luminance);
          pixelCount++;
          
          if (luminance < 50) darkPixels++;
          if (luminance > 200) brightPixels++;
        }

        const avgBrightness = totalBrightness / pixelCount / 255;
        const darkRatio = darkPixels / pixelCount;
        const brightRatio = brightPixels / pixelCount;
        
        if (avgBrightness < 0.3) {
          issues.push('Imagem muito escura');
          suggestions.push('Aumente a iluminação do ambiente');
        } else if (avgBrightness > 0.7) {
          issues.push('Imagem muito clara');
          suggestions.push('Reduza a iluminação direta');
        }
        
        if (darkRatio > 0.3 || brightRatio > 0.3) {
          issues.push('Iluminação irregular');
          suggestions.push('Use iluminação uniforme');
        }

        let varianceSum = 0;
        const avgLuminance = totalBrightness / pixelCount;
        for (const sample of brightnessSamples) {
          varianceSum += Math.pow(sample - avgLuminance, 2);
        }
        const stdDev = Math.sqrt(varianceSum / pixelCount);
        const contrast = Math.min(stdDev / 80, 1);

        let sharpnessScore = 0;
        const width = canvas.width;
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const center = data[idx];
            const left = data[idx - 4];
            const right = data[idx + 4];
            const top = data[idx - width * 4];
            const bottom = data[idx + width * 4];
            const laplacian = Math.abs(4 * center - left - right - top - bottom);
            sharpnessScore += laplacian;
          }
        }
        const normalizedSharpness = Math.min(sharpnessScore / (pixelCount * 50), 1);
        
        if (normalizedSharpness < 0.3) {
          issues.push('Imagem desfocada');
          suggestions.push('Segure o dispositivo firmemente');
        }

        const brightnessScore = 1 - Math.abs(avgBrightness - 0.5) * 2;
        const overallQuality = (brightnessScore * 30 + contrast * 35 + normalizedSharpness * 35);

        resolve({
          brightness: avgBrightness,
          contrast,
          sharpness: normalizedSharpness,
          overallQuality: Math.min(100, Math.max(0, overallQuality)),
          issues,
          suggestions,
        });
      };
      img.onerror = () => {
        resolve({ brightness: 0.5, contrast: 0.5, sharpness: 0.5, overallQuality: 50, issues: [], suggestions: [] });
      };
      img.src = imageData;
    });
  }, []);

  const adaptiveHistogramEqualization = useCallback((imageData: string, clipLimit: number = 2.0): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          histogram[gray]++;
        }

        const totalPixels = data.length / 4;
        const clipThreshold = (clipLimit * totalPixels) / 256;
        
        let clipped = 0;
        for (let i = 0; i < 256; i++) {
          if (histogram[i] > clipThreshold) {
            clipped += histogram[i] - clipThreshold;
            histogram[i] = clipThreshold;
          }
        }
        
        const redistribution = clipped / 256;
        for (let i = 0; i < 256; i++) {
          histogram[i] += redistribution;
        }

        const cdf = new Array(256).fill(0);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i];
        }

        const cdfMin = cdf.find(v => v > 0) || 0;
        const cdfMax = cdf[255];

        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          const newValue = Math.round(((cdf[gray] - cdfMin) / (cdfMax - cdfMin)) * 255);
          
          const ratio = gray > 0 ? newValue / gray : 1;
          const limitedRatio = Math.max(0.5, Math.min(2.0, ratio));
          data[i] = Math.min(255, Math.max(0, data[i] * limitedRatio));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * limitedRatio));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * limitedRatio));
        }

        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const normalizeIllumination = useCallback((imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        const centerStartX = Math.floor(canvas.width * 0.25);
        const centerEndX = Math.floor(canvas.width * 0.75);
        const centerStartY = Math.floor(canvas.height * 0.2);
        const centerEndY = Math.floor(canvas.height * 0.8);
        
        let centerBrightness = 0;
        let centerCount = 0;
        
        for (let y = centerStartY; y < centerEndY; y++) {
          for (let x = centerStartX; x < centerEndX; x++) {
            const idx = (y * canvas.width + x) * 4;
            const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            centerBrightness += luminance;
            centerCount++;
          }
        }
        
        const avgCenterBrightness = centerBrightness / centerCount;
        const targetBrightness = 130;
        const brightnessFactor = targetBrightness / avgCenterBrightness;

        const factor = Math.max(0.6, Math.min(1.8, brightnessFactor));
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] * factor));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor));
        }

        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const enhanceContrast = useCallback((imageData: string, factor: number = 1.2): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        let sumR = 0, sumG = 0, sumB = 0;
        const count = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          sumR += data[i];
          sumG += data[i + 1];
          sumB += data[i + 2];
        }
        
        const meanR = sumR / count;
        const meanG = sumG / count;
        const meanB = sumB / count;

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, meanR + (data[i] - meanR) * factor));
          data[i + 1] = Math.min(255, Math.max(0, meanG + (data[i + 1] - meanG) * factor));
          data[i + 2] = Math.min(255, Math.max(0, meanB + (data[i + 2] - meanB) * factor));
        }

        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const bilateralFilter = useCallback((imageData: string, sigmaSpace: number = 3, sigmaColor: number = 30): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;
        const tempData = new Uint8ClampedArray(data);

        const radius = Math.ceil(sigmaSpace * 2);

        for (let y = radius; y < canvas.height - radius; y++) {
          for (let x = radius; x < canvas.width - radius; x++) {
            const centerIdx = (y * canvas.width + x) * 4;
            const centerR = tempData[centerIdx];
            const centerG = tempData[centerIdx + 1];
            const centerB = tempData[centerIdx + 2];

            let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                const r = tempData[idx];
                const g = tempData[idx + 1];
                const b = tempData[idx + 2];

                const spatialDist = Math.sqrt(dx * dx + dy * dy);
                const colorDist = Math.sqrt(
                  Math.pow(r - centerR, 2) +
                  Math.pow(g - centerG, 2) +
                  Math.pow(b - centerB, 2)
                );

                const weight = 
                  Math.exp(-spatialDist * spatialDist / (2 * sigmaSpace * sigmaSpace)) *
                  Math.exp(-colorDist * colorDist / (2 * sigmaColor * sigmaColor));

                sumR += r * weight;
                sumG += g * weight;
                sumB += b * weight;
                sumWeight += weight;
              }
            }

            data[centerIdx] = sumR / sumWeight;
            data[centerIdx + 1] = sumG / sumWeight;
            data[centerIdx + 2] = sumB / sumWeight;
          }
        }

        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const removeGlare = useCallback((imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          
          if (max > 230 && (max - min) < 30) {
            const factor = 180 / max;
            data[i] = r * factor;
            data[i + 1] = g * factor;
            data[i + 2] = b * factor;
          } else if (max > 245) {
            const factor = 230 / max;
            data[i] = Math.min(255, r * factor);
            data[i + 1] = Math.min(255, g * factor);
            data[i + 2] = Math.min(255, b * factor);
          }
        }

        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const sharpen = useCallback((imageData: string, amount: number = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;
        const tempData = new Uint8ClampedArray(data);

        const kernel = [
          [0, -1, 0],
          [-1, 5 + amount, -1],
          [0, -1, 0]
        ];

        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * canvas.width + (x + kx)) * 4 + c;
                  sum += tempData[idx] * kernel[ky + 1][kx + 1];
                }
              }
              const idx = (y * canvas.width + x) * 4 + c;
              data[idx] = Math.min(255, Math.max(0, sum));
            }
          }
        }

        ctx.putImageData(imageDataObj, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const preprocessSelfie = useCallback(async (imageData: string): Promise<string> => {
    let processed = await adaptiveHistogramEqualization(imageData, 2.0);
    processed = await normalizeIllumination(processed);
    processed = await enhanceContrast(processed, 1.15);
    return processed;
  }, [adaptiveHistogramEqualization, normalizeIllumination, enhanceContrast]);

  const preprocessDocument = useCallback(async (imageData: string): Promise<string> => {
    let processed = await removeGlare(imageData);
    processed = await bilateralFilter(processed, 2, 25);
    processed = await adaptiveHistogramEqualization(processed, 2.5);
    processed = await normalizeIllumination(processed);
    processed = await enhanceContrast(processed, 1.3);
    processed = await sharpen(processed, 0.3);
    return processed;
  }, [removeGlare, bilateralFilter, adaptiveHistogramEqualization, normalizeIllumination, enhanceContrast, sharpen]);

  const createFaceCrop = useCallback((
    imageData: string,
    faceBox: { x: number; y: number; width: number; height: number },
    padding: number = 0.3
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        const paddingX = faceBox.width * padding;
        const paddingY = faceBox.height * padding;
        
        const cropX = Math.max(0, faceBox.x - paddingX);
        const cropY = Math.max(0, faceBox.y - paddingY);
        const cropWidth = Math.min(img.width - cropX, faceBox.width + paddingX * 2);
        const cropHeight = Math.min(img.height - cropY, faceBox.height + paddingY * 2);

        const size = Math.max(cropWidth, cropHeight);
        canvas.width = 224;
        canvas.height = 224;

        ctx.drawImage(
          img,
          cropX, cropY, size, size,
          0, 0, 224, 224
        );

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  return {
    analyzeImageQuality,
    adaptiveHistogramEqualization,
    normalizeIllumination,
    enhanceContrast,
    bilateralFilter,
    removeGlare,
    sharpen,
    preprocessSelfie,
    preprocessDocument,
    createFaceCrop,
  };
};
