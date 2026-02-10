/**
 * Document Validator for Brazilian Documents
 * 
 * Validates CNH, RG, and Passport documents using heuristic analysis.
 * Detects selfies by analyzing face size relative to image dimensions.
 */

export interface DocumentValidationResult {
  valid: boolean;
  isSelfie: boolean;
  confidence: number;
  issues: string[];
  documentType: string | null;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Extracts image dimensions from base64 encoded image
 * Supports PNG, JPEG, GIF, and WebP formats
 */
function getImageDimensions(base64Data: string): ImageDimensions | null {
  try {
    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    
    // Check PNG signature
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      // PNG: width at bytes 16-19, height at bytes 20-23
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    
    // Check JPEG signature
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        
        // SOF0-SOF2 markers contain image dimensions
        if (marker >= 0xC0 && marker <= 0xC2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        
        // Skip to next marker
        if (marker === 0xD8 || marker === 0xD9) {
          offset += 2;
        } else {
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }
    }
    
    // Check WebP signature
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        // VP8 format
        if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
          const width = (buffer[26] | (buffer[27] << 8)) & 0x3FFF;
          const height = (buffer[28] | (buffer[29] << 8)) & 0x3FFF;
          return { width, height };
        }
      }
    }
    
    // Default fallback - assume standard document proportions
    return null;
  } catch (error) {
    console.error('Error extracting image dimensions:', error);
    return null;
  }
}

/**
 * Estimates if an image is likely a selfie based on multiple heuristics
 * Selfies typically have:
 * - Vertical or square aspect ratios (phone held vertically)
 * - High resolution (modern phone cameras)
 * - No visible document edges/borders
 * - Face occupying significant portion of frame
 */
function detectSelfieHeuristics(base64Data: string, dimensions: ImageDimensions | null, documentType?: string): { isSelfie: boolean; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let selfieScore = 0;
  
  // Calculate base64 size (rough estimate of image complexity)
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const estimatedBytes = (base64.length * 3) / 4;
  const estimatedKB = estimatedBytes / 1024;
  
  if (dimensions) {
    const aspectRatio = dimensions.width / dimensions.height;
    const imageArea = dimensions.width * dimensions.height;
    
    // Phone selfies are typically 3:4 or 9:16 (aspect ratio ~0.56-0.75)
    // This is the strongest indicator of a selfie
    if (aspectRatio >= 0.5 && aspectRatio <= 0.8) {
      selfieScore += 45; // High score - typical selfie ratio
      reasons.push('Proporção 3:4 ou 9:16 (típica de selfie de celular)');
    } else if (aspectRatio > 0.8 && aspectRatio < 0.95) {
      selfieScore += 30;
      reasons.push('Imagem em formato vertical (possível selfie)');
    } else if (aspectRatio >= 0.95 && aspectRatio <= 1.05) {
      selfieScore += 25;
      reasons.push('Imagem quadrada (possível selfie ou foto de rosto)');
    }
    
    // Very high resolution with vertical orientation = likely selfie
    // Modern phones take 12MP+ photos (4000x3000 = 12M pixels)
    if (imageArea > 3000000 && aspectRatio < 1.0) {
      selfieScore += 25;
      reasons.push('Alta resolução em formato retrato (típico de câmera frontal)');
    } else if (imageArea > 1500000 && aspectRatio < 0.85) {
      selfieScore += 20;
      reasons.push('Resolução elevada em formato muito vertical');
    }
    
    // Documents have specific aspect ratios
    // CNH: ~1.55-1.6 (horizontal)
    // Passaporte aberto: ~1.4 (duas páginas)
    // Passaporte página: ~0.7 (vertical, mas com MRZ)
    // RG: varies by state, typically ~0.65-0.75 or ~1.4-1.5
    
    // If claiming to be CNH but image is vertical - VERY suspicious
    if (documentType?.toUpperCase() === 'CNH' && aspectRatio < 1.0) {
      selfieScore += 50; // CNH MUST be horizontal
      reasons.push('CNH deve ser horizontal - esta imagem é vertical');
    }
    
    // RG validation: RGs can be vertical in 3:4 ratio when photographed
    // But 9:16 is too narrow - that's a selfie
    if (documentType?.toUpperCase() === 'RG') {
      // 9:16 ratio (0.5625) is almost always a selfie - too narrow for any document
      if (aspectRatio >= 0.5 && aspectRatio <= 0.62) {
        selfieScore += 40;
        reasons.push('Proporção 9:16 é muito estreita para RG');
      }
      // RG in typical photo ratio (3:4 = 0.75) is acceptable - REDUCE score
      else if (aspectRatio >= 0.65 && aspectRatio <= 0.85) {
        selfieScore -= 25; // This is a valid RG photo ratio
      }
    }
    
    // Passport page has specific ratios
    // Closed passport page: ~0.7 (vertical)
    // Open passport (2 pages): ~1.4 (horizontal)
    if (documentType?.toUpperCase() === 'PASSAPORTE' || documentType?.toUpperCase() === 'PASSPORT') {
      // 9:16 ratio is too narrow for passport
      if (aspectRatio >= 0.5 && aspectRatio <= 0.62) {
        selfieScore += 40;
        reasons.push('Proporção 9:16 é muito estreita para passaporte');
      }
      // Passport page in 3:4 or similar vertical ratio is valid - REDUCE score
      else if (aspectRatio >= 0.65 && aspectRatio <= 0.85) {
        selfieScore -= 25; // This is a valid passport photo ratio
      }
    }
    
    // Documents are typically horizontal (landscape) - reduce score
    if (aspectRatio > 1.3 && aspectRatio < 1.8) {
      selfieScore -= 30; // Likely a real document
    }
    
    // Very wide images are almost certainly documents
    if (aspectRatio >= 1.8) {
      selfieScore -= 40;
    }
  }
  
  // Very large file size for the estimated area suggests detailed face
  if (dimensions) {
    const pixelCount = dimensions.width * dimensions.height;
    const bytesPerPixel = estimatedBytes / pixelCount;
    
    // Selfies with detailed faces tend to have higher bytes per pixel
    // Documents with text tend to compress better
    if (bytesPerPixel > 0.6 && dimensions.width < dimensions.height) {
      selfieScore += 15;
      reasons.push('Alta densidade de dados em imagem vertical');
    }
  }
  
  // Large file size without dimensions (fallback)
  if (!dimensions && estimatedKB > 800) {
    selfieScore += 15;
    reasons.push('Arquivo muito grande (possível foto de alta qualidade)');
  }
  
  // Lower threshold for detection - be more aggressive
  const isSelfie = selfieScore >= 35;
  const confidence = Math.min(100, Math.max(0, selfieScore * 1.5));
  
  return { isSelfie, confidence, reasons };
}

/**
 * Validates document characteristics based on type
 */
function validateDocumentCharacteristics(
  documentType: string,
  dimensions: ImageDimensions | null,
  side?: 'front' | 'back'
): { valid: boolean; confidence: number; issues: string[] } {
  const issues: string[] = [];
  let validationScore = 50; // Start neutral
  
  if (!dimensions) {
    issues.push('Não foi possível analisar as dimensões da imagem');
    return { valid: false, confidence: 30, issues };
  }
  
  const aspectRatio = dimensions.width / dimensions.height;
  
  switch (documentType.toUpperCase()) {
    case 'CNH':
      // CNH is horizontal (landscape), typical aspect ratio 1.4-1.7
      if (aspectRatio >= 1.3 && aspectRatio <= 1.8) {
        validationScore += 30;
      } else if (aspectRatio < 1.0) {
        validationScore -= 30;
        issues.push('CNH deve estar em formato horizontal (paisagem)');
      } else {
        validationScore -= 15;
        issues.push('Proporção da imagem não corresponde ao formato típico de CNH');
      }
      
      // Minimum resolution check
      if (dimensions.width < 400 || dimensions.height < 250) {
        validationScore -= 20;
        issues.push('Resolução muito baixa para validação de CNH');
      }
      break;
      
    case 'RG':
      // RG can be vertical (front) or horizontal depending on state
      // Front side typically has photo, fingerprint
      if (side === 'front') {
        if (aspectRatio >= 0.6 && aspectRatio <= 1.6) {
          validationScore += 25;
        } else {
          validationScore -= 15;
          issues.push('Proporção da frente do RG parece incorreta');
        }
      } else if (side === 'back') {
        // Back side has personal data
        if (aspectRatio >= 0.6 && aspectRatio <= 1.6) {
          validationScore += 25;
        } else {
          validationScore -= 15;
          issues.push('Proporção do verso do RG parece incorreta');
        }
      } else {
        // Unknown side - accept wider range
        if (aspectRatio >= 0.5 && aspectRatio <= 1.8) {
          validationScore += 20;
        }
      }
      
      // Minimum resolution check
      if (dimensions.width < 300 || dimensions.height < 200) {
        validationScore -= 20;
        issues.push('Resolução muito baixa para validação de RG');
      }
      break;
      
    case 'PASSAPORTE':
    case 'PASSPORT':
      // Passport pages are typically vertical or slightly horizontal
      if (aspectRatio >= 0.65 && aspectRatio <= 1.0) {
        validationScore += 30;
      } else if (aspectRatio > 1.0 && aspectRatio <= 1.5) {
        validationScore += 15; // Open passport (two pages visible)
      } else {
        validationScore -= 20;
        issues.push('Proporção não corresponde ao formato típico de passaporte');
      }
      
      // Minimum resolution check
      if (dimensions.width < 350 || dimensions.height < 400) {
        validationScore -= 20;
        issues.push('Resolução muito baixa para validação de passaporte');
      }
      break;
      
    default:
      // Generic document validation
      if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
        validationScore += 10;
      } else {
        issues.push('Proporção da imagem não parece ser de um documento');
        validationScore -= 20;
      }
  }
  
  // Check if image seems too small overall
  const imageArea = dimensions.width * dimensions.height;
  if (imageArea < 50000) {
    validationScore -= 25;
    issues.push('Imagem muito pequena - capture com melhor qualidade');
  } else if (imageArea > 50000000) {
    validationScore -= 10;
    issues.push('Imagem muito grande - pode causar lentidão no processamento');
  }
  
  const valid = validationScore >= 50 && issues.filter(i => !i.includes('lentidão')).length === 0;
  const confidence = Math.min(100, Math.max(0, validationScore));
  
  return { valid, confidence, issues };
}

/**
 * Main validation function for Brazilian documents
 * 
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param documentType - Type of document: 'CNH', 'RG', 'PASSAPORTE', or 'auto'
 * @param side - Optional: 'front' or 'back' for RG validation
 * @returns Validation result with confidence and issues
 */
export async function validateDocument(
  imageBase64: string,
  documentType: string,
  side?: 'front' | 'back'
): Promise<DocumentValidationResult> {
  const issues: string[] = [];
  
  // Validate input
  if (!imageBase64 || imageBase64.length < 100) {
    return {
      valid: false,
      isSelfie: false,
      confidence: 0,
      issues: ['Imagem inválida ou vazia'],
      documentType: null
    };
  }
  
  // Extract image dimensions
  const dimensions = getImageDimensions(imageBase64);
  
  // Check for selfie - now considers document type for smarter detection
  // This allows vertical documents (RG, Passport) while still catching selfies
  const selfieCheck = detectSelfieHeuristics(imageBase64, dimensions, documentType);
  
  // ALWAYS reject if detected as selfie - no bypass for known document types
  // The improved heuristics now handle vertical documents properly
  if (selfieCheck.isSelfie) {
    console.log('[DocumentValidator] Selfie detected:', {
      score: selfieCheck.confidence,
      documentType,
      dimensions,
      reasons: selfieCheck.reasons
    });
    
    return {
      valid: false,
      isSelfie: true,
      confidence: selfieCheck.confidence,
      issues: [
        'Esta foto parece ser uma selfie ou foto de rosto',
        'Por favor, fotografe o documento em formato adequado',
        ...selfieCheck.reasons
      ],
      documentType: null
    };
  }
  
  // Validate document characteristics
  const docValidation = validateDocumentCharacteristics(documentType, dimensions, side);
  
  // Combine issues
  issues.push(...selfieCheck.reasons.filter(r => r.includes('possível')));
  issues.push(...docValidation.issues);
  
  // Determine final validation result
  const valid = docValidation.valid && !selfieCheck.isSelfie;
  const confidence = Math.round((docValidation.confidence + (100 - selfieCheck.confidence)) / 2);
  
  // Determine detected document type based on aspect ratio if 'auto'
  let detectedType: string | null = documentType.toUpperCase();
  if (documentType.toLowerCase() === 'auto' && dimensions) {
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio > 1.3) {
      detectedType = 'CNH';
    } else if (aspectRatio < 0.8) {
      detectedType = 'PASSAPORTE';
    } else {
      detectedType = 'RG';
    }
  }
  
  return {
    valid,
    isSelfie: selfieCheck.isSelfie,
    confidence,
    issues: issues.length > 0 ? issues : [],
    documentType: valid ? detectedType : null
  };
}

/**
 * Quick validation for pre-upload checks
 * Only checks basic image validity and obvious selfie detection
 */
export function quickValidate(imageBase64: string): { valid: boolean; reason: string } {
  if (!imageBase64 || imageBase64.length < 100) {
    return { valid: false, reason: 'Imagem inválida' };
  }
  
  const dimensions = getImageDimensions(imageBase64);
  
  if (!dimensions) {
    return { valid: true, reason: 'Formato de imagem não reconhecido, mas será analisado' };
  }
  
  const aspectRatio = dimensions.width / dimensions.height;
  
  // Very vertical images (aspect ratio < 0.6) are likely selfies
  if (aspectRatio < 0.6) {
    return { valid: false, reason: 'Imagem muito vertical - parece ser uma selfie' };
  }
  
  // Very small images
  if (dimensions.width < 200 || dimensions.height < 150) {
    return { valid: false, reason: 'Resolução muito baixa' };
  }
  
  return { valid: true, reason: 'OK' };
}
