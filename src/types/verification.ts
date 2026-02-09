export type VerificationStep = 'welcome' | 'selfie' | 'document' | 'processing' | 'result';

export type DocumentType = 'CNH' | 'RG' | 'RNE' | 'PASSPORT';

export interface FaceDetectionResult {
  detected: boolean;
  centered: boolean;
  goodLighting: boolean;
  lookingAtCamera: boolean;
  quality: number;
  message: string;
}

export interface DocumentDetectionResult {
  detected: boolean;
  fullyVisible: boolean;
  goodFocus: boolean;
  noGlare: boolean;
  quality: number;
  message: string;
}

export interface ComparisonMetrics {
  euclidean: number;
  cosine: number;
  landmarks: number;
  structural: number;
  texture?: number;
  histogram?: number;
  euclideanDistance?: number;
  cosineDistance?: number;
  tripletScore?: number;
  arcfaceScore?: number;
  cosfaceScore?: number;
  spherefaceScore?: number;
  ensembleScore?: number;
}

export interface AlgorithmResult {
  score: number;
  matched: boolean;
  confidence: 'high' | 'medium' | 'low';
  distance?: number;
  angle?: number;
  cosine?: number;
}

export interface EnsembleAlgorithms {
  triplet: AlgorithmResult;
  arcface: AlgorithmResult;
  cosface: AlgorithmResult;
  sphereface: AlgorithmResult;
}

export interface EnsembleStats {
  weightedScore: number;
  votes: number;
  variance: number;
  stdDev: number;
  threshold: number;
}

export interface VerificationResult {
  passed: boolean;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  requiredScore: number;
  metrics: ComparisonMetrics;
  selfieQuality: number;
  documentQuality: number;
  ensembleAgreement?: number;
  adaptiveThreshold?: number;
  algorithms?: EnsembleAlgorithms;
  ensembleStats?: EnsembleStats;
}

export interface VerificationSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  selfieImage?: string;
  selfieTimestamp?: Date;
  documentType?: DocumentType;
  documentImage?: string;
  documentTimestamp?: Date;
  similarityScore?: number;
  status: 'in_progress' | 'approved' | 'rejected';
  result?: VerificationResult;
}

export interface ComparisonResult {
  score: number;
  passed: boolean;
  details: {
    faceMatch: number;
    qualityScore: number;
    livenessScore: number;
  };
}
