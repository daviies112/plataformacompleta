/**
 * Advanced Image Preprocessing
 * Bank-grade image enhancement techniques
 * - CLAHE (Contrast Limited Adaptive Histogram Equalization)
 * - Glare Removal
 * - Sharpening
 */

export class CLAHENormalizer {
  private clipLimit: number;
  private tileSize: number;

  constructor(clipLimit: number = 2.5, tileSize: number = 8) {
    this.clipLimit = clipLimit;
    this.tileSize = tileSize;
  }

  async normalize(imageDataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const tilesX = Math.ceil(canvas.width / this.tileSize);
        const tilesY = Math.ceil(canvas.height / this.tileSize);
        
        for (let ty = 0; ty < tilesY; ty++) {
          for (let tx = 0; tx < tilesX; tx++) {
            const x0 = tx * this.tileSize;
            const y0 = ty * this.tileSize;
            const x1 = Math.min(x0 + this.tileSize, canvas.width);
            const y1 = Math.min(y0 + this.tileSize, canvas.height);
            
            this.equalizeTile(data, canvas.width, x0, y0, x1, y1);
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = imageDataUrl;
    });
  }

  private equalizeTile(data: Uint8ClampedArray, width: number, x0: number, y0: number, x1: number, y1: number) {
    const histogram = new Array(256).fill(0);
    
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * width + x) * 4;
        const gray = Math.round(
          0.299 * data[idx] + 
          0.587 * data[idx + 1] + 
          0.114 * data[idx + 2]
        );
        histogram[gray]++;
      }
    }
    
    const tilePixels = (x1 - x0) * (y1 - y0);
    const clipHeight = (this.clipLimit * tilePixels) / 256;
    
    let clipped = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > clipHeight) {
        clipped += histogram[i] - clipHeight;
        histogram[i] = clipHeight;
      }
    }
    
    const increment = clipped / 256;
    for (let i = 0; i < 256; i++) {
      histogram[i] += increment;
    }
    
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    
    const cdfMin = cdf.find(v => v > 0) || 0;
    const cdfMax = cdf[255];
    
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * width + x) * 4;
        const gray = Math.round(
          0.299 * data[idx] + 
          0.587 * data[idx + 1] + 
          0.114 * data[idx + 2]
        );
        
        const newValue = Math.round(
          ((cdf[gray] - cdfMin) / (cdfMax - cdfMin)) * 255
        );
        
        const ratio = newValue / (gray || 1);
        data[idx] = Math.min(255, Math.max(0, data[idx] * ratio));
        data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] * ratio));
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] * ratio));
      }
    }
  }
}

export async function removeGlare(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max > 230 && (max - min) < 30) {
          const factor = 200 / max;
          data[i] = r * factor;
          data[i + 1] = g * factor;
          data[i + 2] = b * factor;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageDataUrl;
  });
}

export async function sharpen(imageDataUrl: string, amount: number = 0.3): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const tempData = new Uint8ClampedArray(data);
      
      const kernel = [
        [0, -amount, 0],
        [-amount, 1 + 4 * amount, -amount],
        [0, -amount, 0]
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
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageDataUrl;
  });
}

export async function preprocessImage(
  imageDataUrl: string,
  isDocument: boolean = false
): Promise<string> {
  let processed = imageDataUrl;
  
  if (isDocument) {
    processed = await removeGlare(processed);
  }
  
  const clahe = new CLAHENormalizer(isDocument ? 2.5 : 2.0, 8);
  processed = await clahe.normalize(processed);
  
  if (isDocument) {
    processed = await sharpen(processed, 0.3);
  }
  
  return processed;
}
