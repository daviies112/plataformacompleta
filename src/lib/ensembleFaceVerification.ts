/**
 * Advanced Ensemble Face Verification System
 * Combines TripletLoss, ArcFace, CosFace, and SphereFace algorithms
 * Bank-grade facial comparison with adaptive thresholds
 */

import { TripletLoss, ArcFaceLoss, CosFaceLoss, SphereFaceLoss } from './advancedFaceAlgorithms';

interface EnsembleWeights {
  triplet: number;
  arcface: number;
  cosface: number;
  sphereface: number;
}

export interface AlgorithmResult {
  score: number;
  matched: boolean;
  confidence: 'high' | 'medium' | 'low';
  distance?: number;
  angle?: number;
  cosine?: number;
}

export interface EnsembleResult {
  passed: boolean;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  algorithms: {
    triplet: AlgorithmResult;
    arcface: AlgorithmResult;
    cosface: AlgorithmResult;
    sphereface: AlgorithmResult;
  };
  stats: {
    weightedScore: number;
    votes: number;
    variance: number;
    stdDev: number;
    threshold: number;
    agreementCount: number;
    adaptiveThreshold: number;
  };
}

export class EnsembleFaceVerification {
  private tripletLoss: TripletLoss;
  private arcface: ArcFaceLoss;
  private cosface: CosFaceLoss;
  private sphereface: SphereFaceLoss;
  private weights: EnsembleWeights;

  constructor() {
    this.tripletLoss = new TripletLoss(0.2, 2.5);
    this.arcface = new ArcFaceLoss(64, 0.5);
    this.cosface = new CosFaceLoss(64, 0.35);
    this.sphereface = new SphereFaceLoss(64, 1.35);
    
    this.weights = {
      triplet: 0.20,
      arcface: 0.40,
      cosface: 0.25,
      sphereface: 0.15
    };
  }

  compare(emb1: Float32Array, emb2: Float32Array): EnsembleResult {
    const tripletResult = this.tripletLoss.compare(emb1, emb2);
    const arcfaceResult = this.arcface.compare(emb1, emb2);
    const cosfaceResult = this.cosface.compare(emb1, emb2);
    const spherefaceResult = this.sphereface.compare(emb1, emb2);
    
    const weightedScore = 
      tripletResult.similarity * this.weights.triplet +
      arcfaceResult.similarity * this.weights.arcface +
      cosfaceResult.similarity * this.weights.cosface +
      spherefaceResult.similarity * this.weights.sphereface;
    
    const votes = [
      tripletResult.matched,
      arcfaceResult.matched,
      cosfaceResult.matched,
      spherefaceResult.matched
    ].filter(Boolean).length;
    
    const scores = [
      tripletResult.similarity,
      arcfaceResult.similarity,
      cosfaceResult.similarity,
      spherefaceResult.similarity
    ];
    
    const mean = weightedScore;
    const variance = scores.reduce((sum, s) => 
      sum + Math.pow(s - mean, 2), 0
    ) / scores.length;
    
    const stdDev = Math.sqrt(variance);
    
    let confidence: 'high' | 'medium' | 'low';
    if (stdDev < 8 && weightedScore > 75 && votes >= 3) {
      confidence = 'high';
    } else if (stdDev < 15 && weightedScore > 60 && votes >= 2) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    let threshold: number;
    if (confidence === 'high') {
      threshold = 70;
    } else if (confidence === 'medium') {
      threshold = 60;
    } else {
      threshold = 50;
    }
    
    const passed = 
      weightedScore >= threshold &&
      votes >= 2 &&
      confidence !== 'low';
    
    console.log('Scores individuais:', {
      triplet: tripletResult.similarity,
      arcface: arcfaceResult.similarity,
      cosface: cosfaceResult.similarity,
      sphereface: spherefaceResult.similarity
    });
    console.log('Score ponderado:', weightedScore);
    console.log('Votos:', votes, '/4');
    console.log('Variância:', variance);
    console.log('Threshold usado:', threshold);
    
    return {
      passed,
      score: Math.round(weightedScore),
      confidence,
      algorithms: {
        triplet: {
          score: Math.round(tripletResult.similarity),
          matched: tripletResult.matched,
          confidence: tripletResult.confidence,
          distance: tripletResult.distance
        },
        arcface: {
          score: Math.round(arcfaceResult.similarity),
          matched: arcfaceResult.matched,
          confidence: arcfaceResult.confidence,
          angle: Math.round(arcfaceResult.angle),
          cosine: arcfaceResult.cosine
        },
        cosface: {
          score: Math.round(cosfaceResult.similarity),
          matched: cosfaceResult.matched,
          confidence: cosfaceResult.confidence,
          cosine: cosfaceResult.cosine
        },
        sphereface: {
          score: Math.round(spherefaceResult.similarity),
          matched: spherefaceResult.matched,
          confidence: spherefaceResult.confidence,
          cosine: spherefaceResult.cosine
        }
      },
      stats: {
        weightedScore: Math.round(weightedScore),
        votes,
        variance: Math.round(variance),
        stdDev: Math.round(stdDev),
        threshold,
        agreementCount: votes,
        adaptiveThreshold: threshold
      }
    };
  }

  compareDetailed(emb1: Float32Array, emb2: Float32Array): { ensemble: EnsembleResult } {
    const ensemble = this.compare(emb1, emb2);
    return { ensemble };
  }

  adjustWeightsForQuality(quality: number, documentQuality?: number) {
    const avgQuality = documentQuality !== undefined ? (quality + documentQuality) / 2 : quality;
    
    if (avgQuality < 40) {
      this.weights = { triplet: 0.15, arcface: 0.55, cosface: 0.20, sphereface: 0.10 };
    } else if (avgQuality < 70) {
      this.weights = { triplet: 0.18, arcface: 0.45, cosface: 0.25, sphereface: 0.12 };
    } else {
      this.weights = { triplet: 0.20, arcface: 0.40, cosface: 0.25, sphereface: 0.15 };
    }
    console.log('Pesos ajustados para qualidade', avgQuality, ':', this.weights);
  }

  verifyNormalization(embedding: Float32Array): number {
    const norm = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    console.log('Norma do embedding:', norm);
    return norm;
  }
}

export const ensembleVerification = new EnsembleFaceVerification();
export { EnsembleFaceVerification as AdvancedEnsembleFaceVerification };
