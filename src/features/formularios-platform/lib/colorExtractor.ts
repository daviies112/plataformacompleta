interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

function rgbToHsl(r: number, g: number, b: number): string {
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

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lVal = Math.round(l * 100);

  return `hsl(${h}, ${s}%, ${lVal}%)`;
}

function getColorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

function isGrayscale(rgb: RGB, threshold: number = 15): boolean {
  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  return (
    Math.abs(rgb.r - avg) < threshold &&
    Math.abs(rgb.g - avg) < threshold &&
    Math.abs(rgb.b - avg) < threshold
  );
}

function isTooBrightOrDark(rgb: RGB): boolean {
  const brightness = (rgb.r + rgb.g + rgb.b) / 3;
  return brightness > 240 || brightness < 20;
}

export async function extractColorsFromImage(imageUrl: string, numColors: number = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const maxSize = 100;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        const colorMap = new Map<string, number>();
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          if (a < 128) continue;
          
          const rgb: RGB = { r, g, b };
          
          if (isGrayscale(rgb) || isTooBrightOrDark(rgb)) continue;
          
          const roundedR = Math.round(r / 10) * 10;
          const roundedG = Math.round(g / 10) * 10;
          const roundedB = Math.round(b / 10) * 10;
          const colorKey = `${roundedR},${roundedG},${roundedB}`;
          
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
        
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            return { r, g, b };
          });
        
        const selectedColors: RGB[] = [];
        
        for (const color of sortedColors) {
          if (selectedColors.length >= numColors) break;
          
          const isTooSimilar = selectedColors.some(
            selected => getColorDistance(color, selected) < 50
          );
          
          if (!isTooSimilar) {
            selectedColors.push(color);
          }
        }
        
        while (selectedColors.length < numColors && sortedColors.length > 0) {
          const remaining = sortedColors.filter(c => 
            !selectedColors.some(s => s.r === c.r && s.g === c.g && s.b === c.b)
          );
          if (remaining.length > 0) {
            selectedColors.push(remaining[0]);
          } else {
            break;
          }
        }
        
        const hslColors = selectedColors.map(({ r, g, b }) => rgbToHsl(r, g, b));
        
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

function adjustHslLightness(hslString: string, lightnessTarget: number): string {
  const match = hslString.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
  if (!match) {
    console.warn('adjustHslLightness: Invalid HSL format:', hslString);
    return `hsl(0, 0%, ${lightnessTarget}%)`;
  }
  
  const h = Math.round(parseFloat(match[1]));
  const s = Math.round(parseFloat(match[2]));
  
  return `hsl(${h}, ${s}%, ${lightnessTarget}%)`;
}

function getContrastingTextColor(backgroundHsl: string): string {
  const match = backgroundHsl.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
  if (!match) return 'hsl(222, 47%, 11%)';
  
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);
  
  if (l <= 45) {
    return 'hsl(0, 0%, 100%)';
  }
  
  const isYellowish = h >= 40 && h <= 80;
  const isHighlySaturated = s > 70;
  
  if (l < 70 && isYellowish && isHighlySaturated) {
    return 'hsl(222, 47%, 11%)';
  }
  
  if (l >= 70) {
    return 'hsl(222, 47%, 11%)';
  }
  
  return 'hsl(0, 0%, 100%)';
}

function subtleAdjustHslLightness(hslString: string, adjustment: number): string {
  const match = hslString.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
  if (!match) {
    console.warn('subtleAdjustHslLightness: Invalid HSL format:', hslString);
    return hslString;
  }
  
  const h = Math.round(parseFloat(match[1]));
  const s = Math.round(parseFloat(match[2]));
  const originalL = Math.round(parseFloat(match[3]));
  
  // Keep adjustment subtle (±15 max)
  const newL = Math.max(10, Math.min(95, originalL + adjustment));
  
  return `hsl(${h}, ${s}%, ${newL}%)`;
}

export function generateColorVariations(colors: string[]): Array<{
  primary: string;
  secondary: string;
  background: string;
  text: string;
  name: string;
}> {
  if (colors.length === 0) return [];
  
  const variations: Array<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
    name: string;
  }> = [];
  
  const color0 = colors[0];
  const color1 = colors[1] || color0;
  const color2 = colors[2] || color1;
  const color3 = colors[3] || color2;
  const color4 = colors[4] || color0;
  
  // Variação 1: Usa cores extraídas exatas
  const bg1 = subtleAdjustHslLightness(color2, 10);
  variations.push({
    primary: color0,
    secondary: color1,
    background: bg1,
    text: getContrastingTextColor(bg1),
    name: 'Variação 1'
  });
  
  // Variação 2: Usa cores extraídas exatas com leve escurecimento no fundo
  const bg2 = subtleAdjustHslLightness(color3, -15);
  variations.push({
    primary: color1,
    secondary: color2,
    background: bg2,
    text: getContrastingTextColor(bg2),
    name: 'Variação 2'
  });
  
  // Variação 3: Usa cores extraídas exatas
  const bg3 = subtleAdjustHslLightness(color1, 8);
  variations.push({
    primary: color2,
    secondary: color0,
    background: bg3,
    text: getContrastingTextColor(bg3),
    name: 'Variação 3'
  });
  
  // Variação 4: Usa cores extraídas exatas com leve escurecimento no fundo
  const bg4 = subtleAdjustHslLightness(color0, -12);
  variations.push({
    primary: color3,
    secondary: color4,
    background: bg4,
    text: getContrastingTextColor(bg4),
    name: 'Variação 4'
  });
  
  // Variação 5: Usa cores extraídas exatas
  const bg5 = subtleAdjustHslLightness(color2, 12);
  variations.push({
    primary: color4,
    secondary: color3,
    background: bg5,
    text: getContrastingTextColor(bg5),
    name: 'Variação 5'
  });
  
  // Variação 6: Usa cores extraídas exatas com leve escurecimento no fundo
  const bg6 = subtleAdjustHslLightness(color1, -10);
  variations.push({
    primary: color0,
    secondary: color2,
    background: bg6,
    text: getContrastingTextColor(bg6),
    name: 'Variação 6'
  });
  
  return variations;
}
