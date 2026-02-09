/**
 * Advanced Face Recognition Algorithms
 * Implements TripletLoss, ArcFace, CosFace, and SphereFace
 * Bank-grade facial comparison algorithms
 * 
 * References:
 * - FaceNet Paper: https://arxiv.org/abs/1503.03832
 * - ArcFace Paper: https://arxiv.org/abs/1801.07698
 * - CosFace Paper: https://arxiv.org/abs/1801.09414
 * - SphereFace Paper: https://arxiv.org/abs/1704.08063
 */

// 1. TripletLoss (Google FaceNet)
export class TripletLoss {
  private margin: number;
  private decayFactor: number;

  constructor(margin: number = 0.2, decayFactor: number = 2.5) {
    this.margin = margin;
    this.decayFactor = decayFactor;
  }

  euclideanDistance(emb1: Float32Array, emb2: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < emb1.length; i++) {
      const diff = emb1[i] - emb2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  compare(emb1: Float32Array, emb2: Float32Array): {
    distance: number;
    similarity: number;
    matched: boolean;
    confidence: 'high' | 'medium' | 'low';
  } {
    const distance = this.euclideanDistance(emb1, emb2);
    
    // Usar decaimento exponencial (método FaceNet)
    const similarity = Math.exp(-distance * this.decayFactor) * 100;
    
    // Threshold baseado na margem
    const threshold = this.margin * 2; // ~0.4
    const matched = distance < threshold;
    
    let confidence: 'high' | 'medium' | 'low';
    if (distance < 0.30) confidence = 'high';
    else if (distance < 0.50) confidence = 'medium';
    else confidence = 'low';
    
    return { distance, similarity, matched, confidence };
  }
}

// 2. ArcFace (Angular Margin Loss) - MELHOR ALGORITMO
export class ArcFaceLoss {
  private scale: number;
  private margin: number; // radianos

  constructor(scale: number = 64, margin: number = 0.5) {
    this.scale = scale;
    this.margin = margin;
  }

  normalize(embedding: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / (norm || 1);
    }
    return normalized;
  }

  calculateAngle(emb1: Float32Array, emb2: Float32Array): {
    angle: number;
    angleDegrees: number;
    cosine: number;
  } {
    const norm1 = this.normalize(emb1);
    const norm2 = this.normalize(emb2);
    
    // Produto escalar = cos(θ)
    let dotProduct = 0;
    for (let i = 0; i < norm1.length; i++) {
      dotProduct += norm1[i] * norm2[i];
    }
    
    // Limitar entre -1 e 1
    dotProduct = Math.max(-1, Math.min(1, dotProduct));
    const angle = Math.acos(dotProduct);
    
    return {
      angle,
      angleDegrees: angle * (180 / Math.PI),
      cosine: dotProduct
    };
  }

  compare(emb1: Float32Array, emb2: Float32Array): {
    angle: number;
    cosine: number;
    similarity: number;
    matched: boolean;
    confidence: 'high' | 'medium' | 'low';
  } {
    const { angle, cosine } = this.calculateAngle(emb1, emb2);
    
    // Aplicar margem angular
    const angleWithMargin = angle + this.margin;
    const cosineWithMargin = Math.cos(angleWithMargin);
    
    // Logit escalado
    const logit = this.scale * cosineWithMargin;
    
    // Converter para similaridade (0-100)
    const similarity = (1 / (1 + Math.exp(-logit / 10))) * 100;
    
    // Threshold adaptativo
    const threshold = Math.cos(this.margin * 1.5); // ~0.7
    const matched = cosine > threshold;
    
    let confidence: 'high' | 'medium' | 'low';
    if (cosine > 0.85) confidence = 'high';
    else if (cosine > 0.70) confidence = 'medium';
    else confidence = 'low';
    
    return {
      angle: angle * (180 / Math.PI),
      cosine,
      similarity,
      matched,
      confidence
    };
  }
}

// 3. CosFace (Cosine Margin Loss)
export class CosFaceLoss {
  private scale: number;
  private margin: number;

  constructor(scale: number = 64, margin: number = 0.35) {
    this.scale = scale;
    this.margin = margin;
  }

  normalize(embedding: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / (norm || 1);
    }
    return normalized;
  }

  compare(emb1: Float32Array, emb2: Float32Array): {
    cosine: number;
    similarity: number;
    matched: boolean;
    confidence: 'high' | 'medium' | 'low';
  } {
    const norm1 = this.normalize(emb1);
    const norm2 = this.normalize(emb2);
    
    // Produto escalar = cos(θ)
    let cosine = 0;
    for (let i = 0; i < norm1.length; i++) {
      cosine += norm1[i] * norm2[i];
    }
    
    // Aplicar margem no coseno
    const cosineWithMargin = cosine - this.margin;
    
    // Logit escalado
    const logit = this.scale * cosineWithMargin;
    
    // Similaridade
    const similarity = (1 / (1 + Math.exp(-logit / 10))) * 100;
    
    // Threshold ajustado pela margem
    const threshold = 0.5 + this.margin; // ~0.85
    const matched = cosine > threshold;
    
    let confidence: 'high' | 'medium' | 'low';
    if (cosine > 0.90) confidence = 'high';
    else if (cosine > 0.75) confidence = 'medium';
    else confidence = 'low';
    
    return { cosine, similarity, matched, confidence };
  }
}

// 4. SphereFace (Angular Softmax)
export class SphereFaceLoss {
  private scale: number;
  private margin: number; // fator multiplicativo

  constructor(scale: number = 64, margin: number = 1.35) {
    this.scale = scale;
    this.margin = margin;
  }

  normalize(embedding: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / (norm || 1);
    }
    return normalized;
  }

  compare(emb1: Float32Array, emb2: Float32Array): {
    cosine: number;
    similarity: number;
    matched: boolean;
    confidence: 'high' | 'medium' | 'low';
  } {
    const norm1 = this.normalize(emb1);
    const norm2 = this.normalize(emb2);
    
    let cosine = 0;
    for (let i = 0; i < norm1.length; i++) {
      cosine += norm1[i] * norm2[i];
    }
    
    // Calcular ângulo
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
    
    // Aplicar margem multiplicativa
    const angleWithMargin = angle * this.margin;
    const cosineWithMargin = Math.cos(angleWithMargin);
    
    // Logit
    const logit = this.scale * cosineWithMargin;
    const similarity = (1 / (1 + Math.exp(-logit / 10))) * 100;
    
    const threshold = Math.cos(Math.PI / 4 * this.margin); // ~0.7
    const matched = cosine > threshold;
    
    let confidence: 'high' | 'medium' | 'low';
    if (cosine > 0.85) confidence = 'high';
    else if (cosine > 0.70) confidence = 'medium';
    else confidence = 'low';
    
    return { cosine, similarity, matched, confidence };
  }
}
