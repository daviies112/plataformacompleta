/**
 * Color Extractor Library
 * Extracts dominant colors from images and generates color palette variations
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface ColorVariation {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  button: string;
  buttonText: string;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

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

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to string format
 */
function hslToString(hsl: HSL): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

/**
 * Calculate color brightness
 */
function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(rgb1: RGB, rgb2: RGB): number {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * Check if color is grayscale (low saturation)
 */
function isGrayscale(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < 15;
}

/**
 * Extract dominant colors from an image
 */
export async function extractColorsFromImage(
  imageUrl: string,
  maxColors: number = 5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Resize image for better performance
        const maxSize = 100;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // Color frequency map
        const colorMap = new Map<string, { rgb: RGB; count: number }>();
        
        // Analyze pixels
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Skip very light colors (relaxed from 240 to 250)
          const brightness = getBrightness(r, g, b);
          if (brightness > 250) continue;
          
          // Skip very dark colors (relaxed from 20 to 10)
          if (brightness < 10) continue;
          
          // Skip grayscale colors (but allow dark blues, dark reds, etc)
          if (isGrayscale(r, g, b) && brightness > 30 && brightness < 220) continue;
          
          // Round colors to reduce variations
          const roundedR = Math.round(r / 10) * 10;
          const roundedG = Math.round(g / 10) * 10;
          const roundedB = Math.round(b / 10) * 10;
          
          const key = `${roundedR},${roundedG},${roundedB}`;
          
          if (colorMap.has(key)) {
            colorMap.get(key)!.count++;
          } else {
            colorMap.set(key, {
              rgb: { r: roundedR, g: roundedG, b: roundedB },
              count: 1
            });
          }
        }
        
        // Sort by frequency
        const sortedColors = Array.from(colorMap.values())
          .sort((a, b) => b.count - a.count);
        
        // Select distinct colors
        const selectedColors: RGB[] = [];
        const minDistance = 50;
        
        for (const colorData of sortedColors) {
          if (selectedColors.length >= maxColors) break;
          
          const isDifferent = selectedColors.every(
            selected => colorDistance(selected, colorData.rgb) >= minDistance
          );
          
          if (isDifferent || selectedColors.length === 0) {
            selectedColors.push(colorData.rgb);
          }
        }
        
        // Convert to HSL strings
        const hslColors = selectedColors.map(rgb => {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          return hslToString(hsl);
        });
        
        resolve(hslColors);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Adjust HSL lightness to create lighter or darker versions
 */
function adjustLightness(hslString: string, targetLightness: number): string {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslString;
  
  const h = match[1];
  const s = match[2];
  
  return `hsl(${h}, ${s}%, ${targetLightness}%)`;
}

/**
 * Get contrasting text color based on background lightness
 */
function getTextColor(backgroundHsl: string): string {
  const match = backgroundHsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return 'hsl(0, 0%, 10%)';
  
  const lightness = parseInt(match[3]);
  return lightness > 50 ? 'hsl(0, 0%, 10%)' : 'hsl(0, 0%, 98%)';
}

/**
 * Subtle lightness adjustment - keeps colors very similar to originals
 */
function subtleAdjustLightness(hslString: string, adjustment: number): string {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslString;
  
  const h = match[1];
  const s = match[2];
  const originalL = parseInt(match[3]);
  
  // Keep adjustment subtle (±15 max)
  const newL = Math.max(10, Math.min(95, originalL + adjustment));
  
  return `hsl(${h}, ${s}%, ${newL}%)`;
}

/**
 * Generate color palette variations from extracted colors
 * IMPORTANT: Uses ONLY the extracted logo colors or very similar versions
 * Creates 6 variations using the exact colors from the logo
 */
export function generateColorVariations(extractedColors: string[]): ColorVariation[] {
  if (extractedColors.length === 0) {
    return [];
  }

  const variations: ColorVariation[] = [];
  
  const color0 = extractedColors[0];
  const color1 = extractedColors[1] || color0;
  const color2 = extractedColors[2] || color1;
  const color3 = extractedColors[3] || color2;
  const color4 = extractedColors[4] || color0;
  
  // Variação 1: Usa cores extraídas exatas
  variations.push({
    name: 'Variação 1',
    primary: color0,
    secondary: color1,
    background: subtleAdjustLightness(color2, 10),  // Apenas +10% de brilho
    text: getTextColor(subtleAdjustLightness(color2, 10)),
    button: color0,
    buttonText: getTextColor(color0)
  });
  
  // Variação 2: Usa cores extraídas exatas com leve escurecimento no fundo
  variations.push({
    name: 'Variação 2',
    primary: color1,
    secondary: color2,
    background: subtleAdjustLightness(color3, -15),  // Apenas -15% de brilho
    text: getTextColor(subtleAdjustLightness(color3, -15)),
    button: color1,
    buttonText: getTextColor(color1)
  });
  
  // Variação 3: Usa cores extraídas exatas
  variations.push({
    name: 'Variação 3',
    primary: color2,
    secondary: color0,
    background: subtleAdjustLightness(color1, 8),  // Apenas +8% de brilho
    text: getTextColor(subtleAdjustLightness(color1, 8)),
    button: color2,
    buttonText: getTextColor(color2)
  });
  
  // Variação 4: Usa cores extraídas exatas com leve escurecimento no fundo
  variations.push({
    name: 'Variação 4',
    primary: color3,
    secondary: color4,
    background: subtleAdjustLightness(color0, -12),  // Apenas -12% de brilho
    text: getTextColor(subtleAdjustLightness(color0, -12)),
    button: color3,
    buttonText: getTextColor(color3)
  });
  
  // Variação 5: Usa cores extraídas exatas
  variations.push({
    name: 'Variação 5',
    primary: color4,
    secondary: color3,
    background: subtleAdjustLightness(color2, 12),  // Apenas +12% de brilho
    text: getTextColor(subtleAdjustLightness(color2, 12)),
    button: color4,
    buttonText: getTextColor(color4)
  });
  
  // Variação 6: Usa cores extraídas exatas com leve escurecimento no fundo
  variations.push({
    name: 'Variação 6',
    primary: color0,
    secondary: color2,
    background: subtleAdjustLightness(color1, -10),  // Apenas -10% de brilho
    text: getTextColor(subtleAdjustLightness(color1, -10)),
    button: color0,
    buttonText: getTextColor(color0)
  });
  
  return variations;
}

/**
 * Converte uma string HSL para formato HEX
 * @param hsl - String no formato "hsl(h, s%, l%)"
 * @returns String HEX no formato "#RRGGBB"
 */
export function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
  if (!match) {
    // Retornar valor padrão se não conseguir parsear
    console.warn('hslToHex: Invalid HSL format:', hsl);
    return '#3b82f6';
  }
  
  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
