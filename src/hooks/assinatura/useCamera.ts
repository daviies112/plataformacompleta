import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
}

export const useCamera = (options: UseCameraOptions = {}) => {
  const { facingMode = 'user' } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);
  const mountedRef = useRef(true);

  const startCamera = useCallback(async (mode?: 'user' | 'environment') => {
    const targetFacingMode = mode || currentFacingMode;
    
    if (isInitializing) {
      console.log('Camera already initializing');
      return;
    }

    if (streamRef.current) {
      console.log('Stopping existing stream before restart');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsInitializing(true);
    setError(null);
    setIsReady(false);
    setCurrentFacingMode(targetFacingMode);

    try {
      console.log('Checking camera support...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupportedError');
      }

      let stream: MediaStream;
      try {
        console.log('Requesting camera with high quality constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacingMode,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.log('High quality constraints failed, trying medium constraints...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: targetFacingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (mediumErr) {
          console.log('Medium constraints failed, trying basic constraints...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      console.log('Camera stream obtained:', stream.id);
      console.log('Video tracks:', stream.getVideoTracks().length);
      
      if (!mountedRef.current) {
        console.log('Component unmounted, stopping stream');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      setHasPermission(true);

      const videoElement = videoRef.current;
      if (!videoElement) {
        console.error('Video element not found in ref');
        throw new Error('VideoElementNotFound');
      }

      console.log('Attaching stream to video element...');
      
      videoElement.pause();
      videoElement.srcObject = null;
      videoElement.srcObject = stream;
      
      const handleCanPlay = () => {
        console.log('Video can play event fired');
      };
      
      const handlePlaying = () => {
        console.log('Video is now playing');
        console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        if (mountedRef.current) {
          setIsReady(true);
          setIsInitializing(false);
        }
      };
      
      const handleError = (e: Event) => {
        console.error('Video element error:', e);
      };

      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('playing', handlePlaying);
      videoElement.addEventListener('error', handleError);

      console.log('Attempting to play video...');
      try {
        await videoElement.play();
        console.log('Play promise resolved');
      } catch (playErr) {
        console.error('Play error:', playErr);
        if (mountedRef.current) {
          setIsReady(true);
          setIsInitializing(false);
        }
      }

    } catch (err) {
      console.error('Camera error:', err);
      
      if (!mountedRef.current) return;
      
      setHasPermission(false);
      setIsInitializing(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
          setError('Permissão de câmera negada. Clique no ícone de câmera na barra de endereço para permitir.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada no dispositivo.');
        } else if (err.name === 'NotSupportedError' || err.message === 'NotSupportedError') {
          setError('Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari.');
        } else if (err.name === 'NotReadableError') {
          setError('A câmera está em uso por outro aplicativo. Feche outros programas e tente novamente.');
        } else if (err.message === 'VideoElementNotFound') {
          setError('Erro interno: elemento de vídeo não encontrado. Recarregue a página.');
        } else {
          setError(`Erro ao acessar a câmera: ${err.message}`);
        }
      } else {
        setError('Erro desconhecido ao acessar a câmera.');
      }
    }
  }, [facingMode, isInitializing]);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind, track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
    setIsInitializing(false);
  }, []);

  const switchCamera = useCallback(async () => {
    const newMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await startCamera(newMode);
  }, [currentFacingMode, startCamera]);

  const captureImage = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !isReady) {
      console.log('Cannot capture: video not ready', { hasVideo: !!video, isReady });
      return null;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Cannot capture: video has no dimensions');
      return null;
    }

    console.log('Capturing image:', video.videoWidth, 'x', video.videoHeight);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    const timestamp = new Date().toLocaleString('pt-BR');
    ctx.fillText(timestamp, canvas.width - 10, canvas.height - 10);

    console.log('Image captured successfully');
    return canvas.toDataURL('image/jpeg', 0.98);
  }, [isReady, currentFacingMode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isReady,
    isInitializing,
    facingMode: currentFacingMode,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    switchCamera,
    captureImage,
  };
};
