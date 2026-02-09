export interface ColorPalette {
  dominantColor: string;
  palette: string[];
  primary: string;
  secondary: string;
  accent: string;
}

export interface PaletteVariation {
  name: string;
  colors: string[];
  primary: string;
  secondary: string;
  accent: string;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function getLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export async function extractColorsFromImage(imageFile: File): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        const colorMap = new Map<string, number>();
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          if (a < 125) continue;
          
          if (r > 240 && g > 240 && b > 240) continue;
          if (r < 15 && g < 15 && b < 15) continue;
          
          const quantizedR = Math.round(r / 16) * 16;
          const quantizedG = Math.round(g / 16) * 16;
          const quantizedB = Math.round(b / 16) * 16;
          
          const color = `${quantizedR},${quantizedG},${quantizedB}`;
          colorMap.set(color, (colorMap.get(color) || 0) + 1);
        }
        
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        const palette = sortedColors.map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return rgbToHex(r, g, b);
        });
        
        const dominantColor = palette[0];
        
        let primary = dominantColor;
        let secondary = palette[1] || dominantColor;
        let accent = palette[2] || dominantColor;
        
        const primaryLuminance = getLuminance(primary);
        if (primaryLuminance > 0.8 || primaryLuminance < 0.1) {
          const betterColors = palette.filter(c => {
            const lum = getLuminance(c);
            return lum > 0.2 && lum < 0.7;
          });
          if (betterColors.length > 0) {
            primary = betterColors[0];
            secondary = betterColors[1] || palette[1];
            accent = betterColors[2] || palette[2];
          }
        }
        
        resolve({
          dominantColor,
          palette,
          primary,
          secondary,
          accent
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(imageFile);
  });
}

function areVariationsDuplicate(var1: PaletteVariation, var2: PaletteVariation): boolean {
  return var1.primary === var2.primary && 
         var1.secondary === var2.secondary && 
         var1.accent === var2.accent;
}

function tryAddUniqueVariation(
  variations: PaletteVariation[],
  name: string,
  primary: string,
  secondary: string,
  accent: string
): boolean {
  const newVariation: PaletteVariation = {
    name,
    colors: [primary, secondary, accent],
    primary,
    secondary,
    accent
  };
  
  if (!variations.some(v => areVariationsDuplicate(v, newVariation))) {
    variations.push(newVariation);
    return true;
  }
  return false;
}

export function generatePaletteVariations(extractedPalette: ColorPalette): PaletteVariation[] {
  const palette = extractedPalette.palette;
  
  if (palette.length < 3) {
    return [];
  }
  
  const variations: PaletteVariation[] = [];
  
  tryAddUniqueVariation(variations, "Variação 1", palette[0], palette[1], palette[2]);
  
  if (palette.length >= 4) {
    tryAddUniqueVariation(variations, "Variação 2", palette[1], palette[2], palette[3]);
  }
  if (variations.length < 2) {
    tryAddUniqueVariation(variations, "Variação 2", palette[2], palette[0], palette[1]);
  }
  
  if (palette.length >= 6) {
    tryAddUniqueVariation(variations, "Variação 3", palette[3], palette[4], palette[5]);
  }
  if (variations.length < 3) {
    tryAddUniqueVariation(variations, "Variação 3", palette[1], palette[2], palette[0]);
  }
  if (variations.length < 3 && palette.length >= 5) {
    tryAddUniqueVariation(variations, "Variação 3", palette[0], palette[3], palette[4]);
  }
  
  const brightColors = palette.filter(c => getLuminance(c) > 0.35 && getLuminance(c) < 0.75);
  if (brightColors.length >= 3) {
    tryAddUniqueVariation(variations, "Variação 4", brightColors[0], brightColors[1], brightColors[2]);
  }
  
  if (variations.length < 4 && palette.length >= 9) {
    tryAddUniqueVariation(variations, "Variação 4", palette[6], palette[7], palette[8]);
  }
  
  if (variations.length < 4) {
    tryAddUniqueVariation(variations, "Variação 4", palette[2], palette[1], palette[0]);
  }
  
  if (variations.length < 4 && palette.length >= 5) {
    tryAddUniqueVariation(variations, "Variação 4", palette[0], palette[2], palette[4]);
  }
  
  if (variations.length < 4) {
    tryAddUniqueVariation(variations, "Variação 4", palette[1], palette[0], palette[2]);
  }
  
  if (variations.length < 4 && palette.length >= 7) {
    tryAddUniqueVariation(variations, "Variação 4", palette[5], palette[6], palette[0]);
  }
  
  return variations.slice(0, 4);
}
