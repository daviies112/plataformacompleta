import { useCallback } from 'react';
import * as faceapi from 'face-api.js';

const STANDARD_LANDMARKS_112 = [
  { x: 30.2946 + 8, y: 51.6963 },
  { x: 65.5318 + 8, y: 51.5014 },
  { x: 48.0252 + 8, y: 71.7366 },
  { x: 33.5493 + 8, y: 92.3655 },
  { x: 62.7299 + 8, y: 92.2041 },
];

const STANDARD_LANDMARKS_224 = STANDARD_LANDMARKS_112.map(p => ({
  x: p.x * 2,
  y: p.y * 2,
}));

export const useFaceAlignment = () => {
  const get5PointLandmarks = useCallback((landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();

    const leftEyeCenter = {
      x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
      y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
    };
    
    const rightEyeCenter = {
      x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
      y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
    };
    
    const noseTip = nose[3] || nose[Math.floor(nose.length / 2)];
    const leftMouth = mouth[0];
    const rightMouth = mouth[6];

    return [
      leftEyeCenter,
      rightEyeCenter,
      { x: noseTip.x, y: noseTip.y },
      { x: leftMouth.x, y: leftMouth.y },
      { x: rightMouth.x, y: rightMouth.y },
    ];
  }, []);

  const getSimilarityTransform = useCallback((
    srcPoints: { x: number; y: number }[],
    dstPoints: { x: number; y: number }[]
  ) => {
    const n = srcPoints.length;
    
    let srcCenterX = 0, srcCenterY = 0;
    let dstCenterX = 0, dstCenterY = 0;
    
    for (let i = 0; i < n; i++) {
      srcCenterX += srcPoints[i].x;
      srcCenterY += srcPoints[i].y;
      dstCenterX += dstPoints[i].x;
      dstCenterY += dstPoints[i].y;
    }
    
    srcCenterX /= n;
    srcCenterY /= n;
    dstCenterX /= n;
    dstCenterY /= n;

    let srcVar = 0;
    let cov00 = 0, cov01 = 0, cov10 = 0, cov11 = 0;
    
    for (let i = 0; i < n; i++) {
      const srcX = srcPoints[i].x - srcCenterX;
      const srcY = srcPoints[i].y - srcCenterY;
      const dstX = dstPoints[i].x - dstCenterX;
      const dstY = dstPoints[i].y - dstCenterY;
      
      srcVar += srcX * srcX + srcY * srcY;
      cov00 += dstX * srcX;
      cov01 += dstX * srcY;
      cov10 += dstY * srcX;
      cov11 += dstY * srcY;
    }

    const a = cov00 + cov11;
    const b = cov10 - cov01;
    const scale = Math.sqrt(a * a + b * b) / srcVar;
    const cosAngle = a / Math.sqrt(a * a + b * b);
    const sinAngle = b / Math.sqrt(a * a + b * b);

    const tx = dstCenterX - scale * (cosAngle * srcCenterX - sinAngle * srcCenterY);
    const ty = dstCenterY - scale * (sinAngle * srcCenterX + cosAngle * srcCenterY);

    return {
      scale,
      rotation: Math.atan2(sinAngle, cosAngle),
      m: [
        scale * cosAngle, -scale * sinAngle, tx,
        scale * sinAngle, scale * cosAngle, ty,
      ],
    };
  }, []);

  const warpAffine = useCallback((
    imageData: string,
    transform: number[],
    outputSize: number = 224
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

        canvas.width = outputSize;
        canvas.height = outputSize;

        const [a, b, c, d, e, f] = transform;
        const det = a * e - b * d;
        const invA = e / det;
        const invB = -b / det;
        const invC = (b * f - c * e) / det;
        const invD = -d / det;
        const invE = a / det;
        const invF = (c * d - a * f) / det;

        ctx.setTransform(invA, invD, invB, invE, invC, invF);
        ctx.drawImage(img, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  const alignFace = useCallback(async (
    imageData: string,
    landmarks: faceapi.FaceLandmarks68,
    outputSize: number = 224
  ): Promise<string> => {
    const srcPoints = get5PointLandmarks(landmarks);
    const dstPoints = outputSize === 224 ? STANDARD_LANDMARKS_224 : STANDARD_LANDMARKS_112;
    
    const transform = getSimilarityTransform(srcPoints, dstPoints);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = outputSize;
        canvas.height = outputSize;

        const [a, c, e, b, d, f] = transform.m;
        ctx.setTransform(a, b, c, d, e, f);
        ctx.drawImage(img, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, [get5PointLandmarks, getSimilarityTransform]);

  const extractAlignedFace = useCallback(async (
    imageData: string,
    detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>,
    padding: number = 0.2,
    outputSize: number = 224
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        const box = detection.detection.box;
        
        const padX = box.width * padding;
        const padY = box.height * padding;
        const x = Math.max(0, box.x - padX);
        const y = Math.max(0, box.y - padY);
        const width = Math.min(img.width - x, box.width + 2 * padX);
        const height = Math.min(img.height - y, box.height + 2 * padY);

        canvas.width = outputSize;
        canvas.height = outputSize;
        
        ctx.drawImage(
          img,
          x, y, width, height,
          0, 0, outputSize, outputSize
        );

        const croppedData = canvas.toDataURL('image/jpeg', 0.95);
        
        const tempImg = await faceapi.fetchImage(croppedData);
        const newDetection = await faceapi
          .detectSingleFace(tempImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceLandmarks();

        if (newDetection) {
          const aligned = await alignFace(croppedData, newDetection.landmarks, outputSize);
          resolve(aligned);
        } else {
          resolve(croppedData);
        }
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, [alignFace]);

  const calculateEyeAngle = useCallback((landmarks: faceapi.FaceLandmarks68): number => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftCenter = {
      x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
      y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
    };
    
    const rightCenter = {
      x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
      y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
    };
    
    return Math.atan2(rightCenter.y - leftCenter.y, rightCenter.x - leftCenter.x);
  }, []);

  const rotateToAlignEyes = useCallback((
    imageData: string,
    angle: number,
    centerX: number,
    centerY: number
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

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.translate(centerX, centerY);
        ctx.rotate(-angle);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageData);
      img.src = imageData;
    });
  }, []);

  return {
    get5PointLandmarks,
    getSimilarityTransform,
    warpAffine,
    alignFace,
    extractAlignedFace,
    calculateEyeAngle,
    rotateToAlignEyes,
  };
};
