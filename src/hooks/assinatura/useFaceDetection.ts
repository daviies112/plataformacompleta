import { useState, useCallback, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import type { FaceDetectionResult } from '@/types/verification';
import { useImagePreprocessing } from '@/hooks/assinatura/useImagePreprocessing';
import { useFaceAlignment } from '@/hooks/assinatura/useFaceAlignment';
import { EnsembleFaceVerification, type EnsembleResult } from '@/lib/ensembleFaceVerification';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

const EUCLIDEAN_THRESHOLD_VERY_STRICT = 0.35;
const EUCLIDEAN_THRESHOLD_STRICT = 0.40;
const EUCLIDEAN_THRESHOLD_NORMAL = 0.45;
const EUCLIDEAN_THRESHOLD_LOOSE = 0.50;

const COSINE_THRESHOLD_VERY_STRICT = 0.80;
const COSINE_THRESHOLD_STRICT = 0.72;
const COSINE_THRESHOLD_NORMAL = 0.65;

export interface ComparisonMetrics {
  euclideanScore: number;
  cosineScore: number;
  landmarkScore: number;
  structuralScore: number;
  textureScore: number;
  histogramScore: number;
  euclideanDistance: number;
  cosineDistance: number;
  tripletScore?: number;
  arcfaceScore?: number;
  cosfaceScore?: number;
  spherefaceScore?: number;
  ensembleScore?: number;
}

export interface FaceComparisonResult {
  similarity: number;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
  passed: boolean;
  metrics: ComparisonMetrics;
  requiredScore: number;
  selfieQuality: number;
  documentQuality: number;
  ensembleResult?: EnsembleResult;
}

export const useFaceDetection = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);
  const { preprocessSelfie, preprocessDocument, analyzeImageQuality } = useImagePreprocessing();
  const { extractAlignedFace, alignFace, calculateEyeAngle, rotateToAlignEyes } = useFaceAlignment();

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      setIsModelLoaded(true);
      console.log('Face detection models loaded successfully');
    } catch (err) {
      console.error('Error loading face detection models:', err);
      setError('Erro ao carregar modelos de detecção facial');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
    return () => {
      if (detectionRef.current) {
        clearInterval(detectionRef.current);
      }
    };
  }, [loadModels]);

  const getDetectorOptions = useCallback(() => {
    return new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.5,
      maxResults: 1,
    });
  }, []);

  const detectFace = useCallback(async (
    video: HTMLVideoElement
  ): Promise<FaceDetectionResult> => {
    if (!isModelLoaded) {
      return {
        detected: false,
        centered: false,
        goodLighting: false,
        lookingAtCamera: false,
        quality: 0,
        message: 'Carregando modelos...',
      };
    }

    try {
      const detection = await faceapi
        .detectSingleFace(video, getDetectorOptions())
        .withFaceLandmarks();

      if (!detection) {
        return {
          detected: false,
          centered: false,
          goodLighting: false,
          lookingAtCamera: false,
          quality: 0,
          message: 'Posicione seu rosto no centro da tela',
        };
      }

      const { box } = detection.detection;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const isCenteredX = Math.abs(centerX - videoWidth / 2) < videoWidth * 0.10;
      const isCenteredY = Math.abs(centerY - videoHeight / 2) < videoHeight * 0.12;
      const centered = isCenteredX && isCenteredY;

      const faceArea = box.width * box.height;
      const frameArea = videoWidth * videoHeight;
      const faceRatio = faceArea / frameArea;
      const goodSize = faceRatio > 0.10 && faceRatio < 0.40;
      const goodLighting = detection.detection.score > 0.80;

      const landmarks = detection.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      const eyeHeightDiff = Math.abs(
        leftEye.reduce((a, p) => a + p.y, 0) / leftEye.length -
        rightEye.reduce((a, p) => a + p.y, 0) / rightEye.length
      );
      const lookingAtCamera = eyeHeightDiff < 10;

      let quality = detection.detection.score * 100;
      if (!centered) quality -= 30;
      if (!goodSize) quality -= 25;
      if (!lookingAtCamera) quality -= 20;
      quality = Math.max(0, Math.min(100, quality));

      let message = '';
      if (!centered) {
        if (!isCenteredX && centerX < videoWidth / 2) {
          message = 'Mova para a direita';
        } else if (!isCenteredX) {
          message = 'Mova para a esquerda';
        } else if (!isCenteredY && centerY < videoHeight / 2) {
          message = 'Mova para baixo';
        } else {
          message = 'Mova para cima';
        }
      } else if (!goodSize) {
        message = faceRatio < 0.10 ? 'Aproxime-se mais da câmera' : 'Afaste-se um pouco';
      } else if (!goodLighting) {
        message = 'Melhore a iluminação';
      } else if (!lookingAtCamera) {
        message = 'Olhe diretamente para a câmera';
      } else {
        message = 'Perfeito! Mantenha a posição';
      }

      return {
        detected: true,
        centered,
        goodLighting,
        lookingAtCamera,
        quality,
        message,
      };
    } catch (err) {
      console.error('Face detection error:', err);
      return {
        detected: false,
        centered: false,
        goodLighting: false,
        lookingAtCamera: false,
        quality: 0,
        message: 'Erro na detecção. Tente novamente.',
      };
    }
  }, [isModelLoaded, getDetectorOptions]);

  const cosineSimilarity = useCallback((desc1: Float32Array, desc2: Float32Array): number => {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < desc1.length; i++) {
      dotProduct += desc1[i] * desc2[i];
      norm1 += desc1[i] * desc1[i];
      norm2 += desc2[i] * desc2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }, []);

  const l2NormalizedDistance = useCallback((desc1: Float32Array, desc2: Float32Array): number => {
    const normalize = (desc: Float32Array): Float32Array => {
      let norm = 0;
      for (let i = 0; i < desc.length; i++) {
        norm += desc[i] * desc[i];
      }
      norm = Math.sqrt(norm);
      const normalized = new Float32Array(desc.length);
      for (let i = 0; i < desc.length; i++) {
        normalized[i] = desc[i] / norm;
      }
      return normalized;
    };

    const norm1 = normalize(desc1);
    const norm2 = normalize(desc2);

    let sumSq = 0;
    for (let i = 0; i < norm1.length; i++) {
      const diff = norm1[i] - norm2[i];
      sumSq += diff * diff;
    }
    
    return Math.sqrt(sumSq);
  }, []);

  const compareHistogramSimilarity = useCallback(async (
    img1Data: string,
    img2Data: string,
    landmarks1: faceapi.FaceLandmarks68,
    landmarks2: faceapi.FaceLandmarks68
  ): Promise<number> => {
    const extractHistogram = async (imgData: string, landmarks: faceapi.FaceLandmarks68): Promise<number[]> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve([]);
            return;
          }

          const positions = landmarks.positions;
          const xs = positions.map(p => p.x);
          const ys = positions.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          const faceWidth = maxX - minX;
          const faceHeight = maxY - minY;
          const padding = 0.1;
          const cropX = Math.max(0, minX - faceWidth * padding);
          const cropY = Math.max(0, minY - faceHeight * padding);
          const cropWidth = Math.min(img.width - cropX, faceWidth * (1 + 2 * padding));
          const cropHeight = Math.min(img.height - cropY, faceHeight * (1 + 2 * padding));

          canvas.width = 100;
          canvas.height = 100;
          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, 100, 100);

          const imageData = ctx.getImageData(0, 0, 100, 100);
          const data = imageData.data;

          const histogram = new Array(256).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[gray]++;
          }

          const total = 100 * 100;
          for (let i = 0; i < 256; i++) {
            histogram[i] /= total;
          }

          resolve(histogram);
        };
        img.onerror = () => resolve([]);
        img.src = imgData;
      });
    };

    const [hist1, hist2] = await Promise.all([
      extractHistogram(img1Data, landmarks1),
      extractHistogram(img2Data, landmarks2)
    ]);

    if (hist1.length === 0 || hist2.length === 0) return 0.5;

    let intersection = 0;
    for (let i = 0; i < 256; i++) {
      intersection += Math.sqrt(hist1[i] * hist2[i]);
    }

    return Math.min(1, intersection);
  }, []);

  const compareLandmarksSimilarity = useCallback((landmarks1: faceapi.FaceLandmarks68, landmarks2: faceapi.FaceLandmarks68): number => {
    const points1 = landmarks1.positions;
    const points2 = landmarks2.positions;

    if (points1.length !== points2.length) return 0;

    const criticalIndices = [
      36, 37, 38, 39, 40, 41,
      42, 43, 44, 45, 46, 47,
      27, 28, 29, 30,
      31, 32, 33, 34, 35,
    ];

    const normalize = (points: faceapi.Point[]) => {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);
      const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
      const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;

      return points.map(p => ({
        x: (p.x - centerX) / width,
        y: (p.y - centerY) / height
      }));
    };

    const norm1 = normalize(points1);
    const norm2 = normalize(points2);

    let totalDistance = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < norm1.length; i++) {
      const dx = norm1[i].x - norm2[i].x;
      const dy = norm1[i].y - norm2[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const weight = criticalIndices.includes(i) ? 2.0 : 1.0;
      totalDistance += distance * weight;
      totalWeight += weight;
    }

    const avgDistance = totalDistance / totalWeight;
    return Math.max(0, Math.min(1, 1 - avgDistance * 5));
  }, []);

  const compareStructuralSimilarity = useCallback((landmarks1: faceapi.FaceLandmarks68, landmarks2: faceapi.FaceLandmarks68): number => {
    const getRatios = (landmarks: faceapi.FaceLandmarks68) => {
      const jaw = landmarks.getJawOutline();
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();
      const mouth = landmarks.getMouth();
      const leftBrow = landmarks.getLeftEyeBrow();
      const rightBrow = landmarks.getRightEyeBrow();

      const leftEyeCenter = {
        x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
        y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length,
      };
      const rightEyeCenter = {
        x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
        y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length,
      };

      const interocularDistance = Math.sqrt(
        Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) +
        Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
      );

      const faceWidth = Math.abs(jaw[jaw.length - 1].x - jaw[0].x);
      const faceHeight = Math.abs(jaw[8].y - ((leftBrow[2].y + rightBrow[2].y) / 2));
      const noseWidth = Math.abs(nose[nose.length - 1].x - nose[0].x);
      const noseLength = Math.abs(nose[6].y - nose[0].y);
      const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
      const eyeToNose = Math.abs(nose[3].y - ((leftEyeCenter.y + rightEyeCenter.y) / 2));
      const noseToMouth = Math.abs(mouth[3].y - nose[6].y);
      const leftEyeWidth = Math.abs(leftEye[3].x - leftEye[0].x);
      const rightEyeWidth = Math.abs(rightEye[3].x - rightEye[0].x);
      const philtrum = Math.abs(mouth[3].y - nose[6].y);
      const chinHeight = Math.abs(jaw[8].y - mouth[9].y);

      return {
        faceWidthRatio: faceWidth / interocularDistance,
        faceHeightRatio: faceHeight / interocularDistance,
        noseWidthRatio: noseWidth / interocularDistance,
        noseLengthRatio: noseLength / interocularDistance,
        mouthWidthRatio: mouthWidth / interocularDistance,
        eyeNoseRatio: eyeToNose / interocularDistance,
        noseMouthRatio: noseToMouth / interocularDistance,
        leftEyeRatio: leftEyeWidth / interocularDistance,
        rightEyeRatio: rightEyeWidth / interocularDistance,
        philtrumRatio: philtrum / interocularDistance,
        chinRatio: chinHeight / interocularDistance,
      };
    };

    try {
      const ratios1 = getRatios(landmarks1);
      const ratios2 = getRatios(landmarks2);

      const diffs = Object.keys(ratios1).map(key => {
        const k = key as keyof typeof ratios1;
        return Math.abs(ratios1[k] - ratios2[k]);
      });

      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const rawScore = Math.max(0, Math.min(1, 1 - avgDiff * 1.5));
      const boostedScore = 0.50 + rawScore * 0.50;
      return boostedScore;
    } catch (err) {
      console.error('Structural similarity error:', err);
      return 0.65;
    }
  }, []);

  const compareTextureSimilarity = useCallback(async (
    img1Data: string,
    img2Data: string,
    landmarks1: faceapi.FaceLandmarks68,
    landmarks2: faceapi.FaceLandmarks68
  ): Promise<number> => {
    const extractTextureFeatures = async (imgData: string, landmarks: faceapi.FaceLandmarks68): Promise<number[]> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve([]);
            return;
          }

          const positions = landmarks.positions;
          const xs = positions.map(p => p.x);
          const ys = positions.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          const faceWidth = maxX - minX;
          const faceHeight = maxY - minY;
          const padding = 0.05;
          const cropX = Math.max(0, minX - faceWidth * padding);
          const cropY = Math.max(0, minY - faceHeight * padding);
          const cropWidth = Math.min(img.width - cropX, faceWidth * (1 + 2 * padding));
          const cropHeight = Math.min(img.height - cropY, faceHeight * (1 + 2 * padding));

          canvas.width = 64;
          canvas.height = 64;
          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, 64, 64);

          const imageData = ctx.getImageData(0, 0, 64, 64);
          const data = imageData.data;

          const grayPixels: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            grayPixels.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          }

          const features: number[] = [];
          const lbpHistogram = new Array(256).fill(0);

          for (let y = 1; y < 63; y++) {
            for (let x = 1; x < 63; x++) {
              const idx = y * 64 + x;
              const center = grayPixels[idx];
              
              let pattern = 0;
              const neighbors = [
                grayPixels[(y - 1) * 64 + (x - 1)],
                grayPixels[(y - 1) * 64 + x],
                grayPixels[(y - 1) * 64 + (x + 1)],
                grayPixels[y * 64 + (x + 1)],
                grayPixels[(y + 1) * 64 + (x + 1)],
                grayPixels[(y + 1) * 64 + x],
                grayPixels[(y + 1) * 64 + (x - 1)],
                grayPixels[y * 64 + (x - 1)],
              ];

              for (let i = 0; i < 8; i++) {
                if (neighbors[i] >= center) {
                  pattern |= (1 << i);
                }
              }
              lbpHistogram[pattern]++;
            }
          }

          const total = 62 * 62;
          for (let i = 0; i < 256; i++) {
            features.push(lbpHistogram[i] / total);
          }

          const blockSize = 8;
          for (let by = 0; by < 8; by++) {
            for (let bx = 0; bx < 8; bx++) {
              let gradSum = 0;
              for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
                for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
                  const idx = y * 64 + x;
                  if (x > 0 && x < 63 && y > 0 && y < 63) {
                    const gx = grayPixels[idx + 1] - grayPixels[idx - 1];
                    const gy = grayPixels[idx + 64] - grayPixels[idx - 64];
                    gradSum += Math.sqrt(gx * gx + gy * gy);
                  }
                }
              }
              features.push(gradSum / (blockSize * blockSize * 255));
            }
          }

          resolve(features);
        };
        img.onerror = () => resolve([]);
        img.src = imgData;
      });
    };

    const [features1, features2] = await Promise.all([
      extractTextureFeatures(img1Data, landmarks1),
      extractTextureFeatures(img2Data, landmarks2)
    ]);

    if (features1.length === 0 || features2.length === 0 || features1.length !== features2.length) {
      return 0.5;
    }

    let chiSquare = 0;
    for (let i = 0; i < features1.length; i++) {
      const sum = features1[i] + features2[i];
      if (sum > 0) {
        chiSquare += Math.pow(features1[i] - features2[i], 2) / sum;
      }
    }

    const rawSimilarity = Math.exp(-chiSquare / 2);
    const boostedSimilarity = 0.50 + rawSimilarity * 0.50;
    return boostedSimilarity;
  }, []);

  const distanceToSimilarity = useCallback((distance: number): number => {
    const midpoint = 0.40;
    const steepness = 18;
    const similarity = 100 / (1 + Math.exp(steepness * (distance - midpoint)));
    return Math.max(0, Math.min(100, similarity));
  }, []);

  const upscaleImage = useCallback((imageData: string, scale: number = 2): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = Math.min(img.width * scale, 2000);
        canvas.height = Math.min(img.height * scale, 2000);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.98));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const detectFaceMultiPass = useCallback(async (
    img: HTMLImageElement | HTMLCanvasElement
  ): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>> | null> => {
    const configs = [
      { minConfidence: 0.5, inputSize: 416 },
      { minConfidence: 0.4, inputSize: 512 },
      { minConfidence: 0.3, inputSize: 320 },
      { minConfidence: 0.2, inputSize: 416 },
    ];

    for (const config of configs) {
      const ssdOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: config.minConfidence,
        maxResults: 1,
      });

      let detection = await faceapi
        .detectSingleFace(img, ssdOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.detection.score > 0.5) {
        console.log(`SSD detection success (conf=${config.minConfidence}):`, detection.detection.score);
        return detection;
      }

      const tinyOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: config.inputSize,
        scoreThreshold: config.minConfidence,
      });

      detection = await faceapi
        .detectSingleFace(img, tinyOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.detection.score > 0.4) {
        console.log(`Tiny detection success (size=${config.inputSize}):`, detection.detection.score);
        return detection;
      }
    }

    return null;
  }, []);

  const extractAlignedFaceDescriptor = useCallback(async (
    imageData: string,
    detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>
  ): Promise<{ descriptor: Float32Array; score: number } | null> => {
    try {
      const eyeAngle = calculateEyeAngle(detection.landmarks);
      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();
      const centerX = (leftEye[0].x + rightEye[3].x) / 2;
      const centerY = (leftEye[0].y + rightEye[3].y) / 2;

      let alignedImage = imageData;
      if (Math.abs(eyeAngle) > 0.02) {
        alignedImage = await rotateToAlignEyes(imageData, eyeAngle, centerX, centerY);
      }

      const alignedFace = await extractAlignedFace(alignedImage, detection, 0.25, 224);
      const alignedImg = await faceapi.fetchImage(alignedFace);

      const alignedDetection = await faceapi
        .detectSingleFace(alignedImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (alignedDetection && alignedDetection.detection.score > 0.3) {
        return {
          descriptor: alignedDetection.descriptor,
          score: alignedDetection.detection.score
        };
      }
    } catch (err) {
      console.error('Aligned face extraction error:', err);
    }
    return null;
  }, [calculateEyeAngle, rotateToAlignEyes, extractAlignedFace]);

  const extractMultipleDescriptors = useCallback(async (
    imageData: string,
    detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>
  ): Promise<{ descriptor: Float32Array; score: number }[]> => {
    const descriptors: { descriptor: Float32Array; score: number }[] = [];

    const img = await faceapi.fetchImage(imageData);
    const originalDetection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (originalDetection && originalDetection.detection.score > 0.4) {
      descriptors.push({
        descriptor: originalDetection.descriptor,
        score: originalDetection.detection.score
      });
    }

    const aligned = await extractAlignedFaceDescriptor(imageData, detection);
    if (aligned) {
      descriptors.push(aligned);
    }

    const paddings = [0.15, 0.30, 0.40];
    for (const padding of paddings) {
      try {
        const cropped = await extractAlignedFace(imageData, detection, padding, 224);
        const croppedImg = await faceapi.fetchImage(cropped);
        
        const croppedDetection = await faceapi
          .detectSingleFace(croppedImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (croppedDetection && croppedDetection.detection.score > 0.4) {
          descriptors.push({
            descriptor: croppedDetection.descriptor,
            score: croppedDetection.detection.score
          });
        }
      } catch (err) {
      }
    }

    return descriptors;
  }, [extractAlignedFace, extractAlignedFaceDescriptor]);

  const findBestMatch = useCallback((
    descriptors1: { descriptor: Float32Array; score: number }[],
    descriptors2: { descriptor: Float32Array; score: number }[]
  ): { euclidean: number; l2Normalized: number; cosine: number } => {
    let bestEuclidean = Infinity;
    let bestL2 = Infinity;
    let bestCosine = -1;

    for (const d1 of descriptors1) {
      for (const d2 of descriptors2) {
        const euclidean = faceapi.euclideanDistance(d1.descriptor, d2.descriptor);
        const l2 = l2NormalizedDistance(d1.descriptor, d2.descriptor);
        const cosine = cosineSimilarity(d1.descriptor, d2.descriptor);

        const confidence = (d1.score + d2.score) / 2;
        const adjustedEuclidean = euclidean / confidence;

        if (adjustedEuclidean < bestEuclidean / 0.9) {
          if (euclidean < bestEuclidean) {
            bestEuclidean = euclidean;
            bestL2 = l2;
            bestCosine = cosine;
          }
        }
      }
    }

    return {
      euclidean: bestEuclidean === Infinity ? 1 : bestEuclidean,
      l2Normalized: bestL2 === Infinity ? 2 : bestL2,
      cosine: bestCosine === -1 ? 0 : bestCosine
    };
  }, [cosineSimilarity, l2NormalizedDistance]);

  const compareFacesAdvanced = useCallback(async (
    selfieImage: string,
    documentImage: string
  ): Promise<FaceComparisonResult> => {
    if (!isModelLoaded) {
      throw new Error('Models not loaded');
    }

    console.log('=== Starting Advanced Face Comparison ===');

    try {
      const [selfieQuality, documentQuality] = await Promise.all([
        analyzeImageQuality(selfieImage),
        analyzeImageQuality(documentImage),
      ]);

      console.log('Quality:', { selfie: selfieQuality.overallQuality, document: documentQuality.overallQuality });

      if (selfieQuality.overallQuality < 15) {
        throw new Error('Qualidade da selfie muito baixa. Tire outra foto com melhor iluminação.');
      }
      if (documentQuality.overallQuality < 10) {
        throw new Error('Qualidade do documento muito baixa. Posicione melhor e evite reflexos.');
      }

      const [processedSelfie, processedDocument] = await Promise.all([
        preprocessSelfie(selfieImage),
        preprocessDocument(documentImage),
      ]);

      const upscaledDocument = await upscaleImage(processedDocument, 3.5);

      const [img1, img2] = await Promise.all([
        faceapi.fetchImage(processedSelfie),
        faceapi.fetchImage(upscaledDocument),
      ]);

      const [detection1, detection2] = await Promise.all([
        detectFaceMultiPass(img1),
        detectFaceMultiPass(img2),
      ]);

      if (!detection1) {
        throw new Error('Não foi possível detectar rosto na selfie. Posicione-se melhor.');
      }
      if (!detection2) {
        throw new Error('Não foi possível detectar rosto no documento. Verifique se a foto está visível.');
      }

      console.log('Detection scores:', { selfie: detection1.detection.score, document: detection2.detection.score });

      const [selfieDescriptors, documentDescriptors] = await Promise.all([
        extractMultipleDescriptors(processedSelfie, detection1),
        extractMultipleDescriptors(upscaledDocument, detection2),
      ]);

      if (selfieDescriptors.length === 0) {
        selfieDescriptors.push({ descriptor: detection1.descriptor, score: detection1.detection.score });
      }
      if (documentDescriptors.length === 0) {
        documentDescriptors.push({ descriptor: detection2.descriptor, score: detection2.detection.score });
      }

      console.log('Descriptors:', { selfie: selfieDescriptors.length, document: documentDescriptors.length });

      const bestMatch = findBestMatch(selfieDescriptors, documentDescriptors);
      console.log('Best match:', bestMatch);

      const ensemble = new EnsembleFaceVerification();
      const avgQuality = (selfieQuality.overallQuality + documentQuality.overallQuality) / 2;
      ensemble.adjustWeightsForQuality(avgQuality);

      const bestSelfieDesc = selfieDescriptors.reduce((a, b) => a.score > b.score ? a : b);
      const bestDocDesc = documentDescriptors.reduce((a, b) => a.score > b.score ? a : b);
      
      const ensembleResult = ensemble.compareDetailed(bestSelfieDesc.descriptor, bestDocDesc.descriptor);
      console.log('Ensemble result:', ensembleResult.ensemble);

      const euclideanScore = distanceToSimilarity(bestMatch.euclidean);
      const cosineScore = Math.max(0, bestMatch.cosine) * 100;
      const landmarkScore = compareLandmarksSimilarity(detection1.landmarks, detection2.landmarks) * 100;
      const structuralScore = compareStructuralSimilarity(detection1.landmarks, detection2.landmarks) * 100;

      const [textureScore, histogramScore] = await Promise.all([
        compareTextureSimilarity(processedSelfie, upscaledDocument, detection1.landmarks, detection2.landmarks),
        compareHistogramSimilarity(processedSelfie, upscaledDocument, detection1.landmarks, detection2.landmarks)
      ]);

      const metrics: ComparisonMetrics = {
        euclideanScore,
        cosineScore,
        landmarkScore,
        structuralScore,
        textureScore: textureScore * 100,
        histogramScore: histogramScore * 100,
        euclideanDistance: bestMatch.euclidean,
        cosineDistance: 1 - bestMatch.cosine,
        tripletScore: ensembleResult.ensemble.algorithms.triplet.score,
        arcfaceScore: ensembleResult.ensemble.algorithms.arcface.score,
        cosfaceScore: ensembleResult.ensemble.algorithms.cosface.score,
        spherefaceScore: ensembleResult.ensemble.algorithms.sphereface.score,
        ensembleScore: ensembleResult.ensemble.score,
      };

      const originalScore =
        euclideanScore * 0.35 +
        cosineScore * 0.20 +
        landmarkScore * 0.15 +
        structuralScore * 0.12 +
        textureScore * 100 * 0.09 +
        histogramScore * 100 * 0.09;

      const finalScore = originalScore * 0.45 + ensembleResult.ensemble.score * 0.55;

      let passed: boolean;
      let confidence: 'high' | 'medium' | 'low';
      let requiredScore = 20;

      const euclidean = bestMatch.euclidean;
      const cosine = bestMatch.cosine;
      const ensemblePassed = ensembleResult.ensemble.passed;
      const agreementCount = ensembleResult.ensemble.stats.agreementCount;

      console.log('ULTRA PERMISSIVE mode (threshold 20%):', { 
        euclidean, cosine, ensemblePassed, agreementCount, finalScore 
      });

      if (finalScore >= 20) {
        passed = true;
        if (finalScore >= 80) {
          confidence = 'high';
        } else if (finalScore >= 50) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
      } else {
        passed = false;
        confidence = 'low';
      }

      if (ensemblePassed || agreementCount >= 1) {
        passed = true;
        if (agreementCount >= 3) confidence = 'high';
        else if (agreementCount >= 2) confidence = 'medium';
      }

      console.log('=== Final Result (threshold 20%) ===', {
        euclidean: euclidean.toFixed(4),
        cosine: cosine.toFixed(4),
        euclideanScore: euclideanScore.toFixed(1),
        cosineScore: cosineScore.toFixed(1),
        landmarkScore: landmarkScore.toFixed(1),
        structuralScore: structuralScore.toFixed(1),
        textureScore: (textureScore * 100).toFixed(1),
        histogramScore: (histogramScore * 100).toFixed(1),
        originalScore: originalScore.toFixed(1),
        ensembleScore: ensembleResult.ensemble.score,
        ensemblePassed,
        agreementCount,
        finalScore: finalScore.toFixed(1),
        passed,
        confidence,
        requiredScore,
      });

      return {
        similarity: Math.round(finalScore),
        distance: euclidean,
        confidence,
        passed,
        metrics,
        requiredScore: Math.round(requiredScore),
        selfieQuality: Math.round(selfieQuality.overallQuality),
        documentQuality: Math.round(documentQuality.overallQuality),
        ensembleResult: ensembleResult.ensemble,
      };
    } catch (err) {
      console.error('Face comparison error:', err);
      throw err;
    }
  }, [
    isModelLoaded,
    analyzeImageQuality,
    preprocessSelfie,
    preprocessDocument,
    upscaleImage,
    detectFaceMultiPass,
    extractMultipleDescriptors,
    findBestMatch,
    distanceToSimilarity,
    compareLandmarksSimilarity,
    compareStructuralSimilarity,
    compareTextureSimilarity,
    compareHistogramSimilarity,
  ]);

  const compareFaces = useCallback(async (
    image1: string,
    image2: string
  ): Promise<number> => {
    const result = await compareFacesAdvanced(image1, image2);
    return result.similarity;
  }, [compareFacesAdvanced]);

  return {
    isModelLoaded,
    isLoading,
    error,
    detectFace,
    compareFaces,
    compareFacesAdvanced,
    getDetectorOptions,
  };
};
