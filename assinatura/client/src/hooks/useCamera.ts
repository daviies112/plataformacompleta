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
  const mountedRef = useRef(true);

  const startCamera = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isInitializing) {
      console.log('Camera already initializing');
      return;
    }

    // Stop existing stream first
    if (streamRef.current) {
      console.log('Stopping existing stream before restart');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsInitializing(true);
    setError(null);
    setIsReady(false);

    try {
      console.log('Checking camera support...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupportedError');
      }

      // First try with high quality constraints for better face comparison
      let stream: MediaStream;
      try {
        console.log('Requesting camera with high quality constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
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
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (mediumErr) {
          console.log('Medium constraints failed, trying basic constraints...');
          // Fallback to basic constraints
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

      // Check if video element exists
      const videoElement = videoRef.current;
      if (!videoElement) {
        console.error('Video element not found in ref');
        throw new Error('VideoElementNotFound');
      }

      console.log('Attaching stream to video element...');
      
      // Reset video element state
      videoElement.pause();
      videoElement.srcObject = null;
      
      // Attach new stream
      videoElement.srcObject = stream;
      
      // Set up event listeners for debugging
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

      // Try to play
      console.log('Attempting to play video...');
      try {
        await videoElement.play();
        console.log('Play promise resolved');
      } catch (playErr) {
        console.error('Play error:', playErr);
        // On some browsers, play() needs user interaction
        // We'll set ready anyway and let the video autoplay
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
      
      // Clean up any partial stream
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

  const captureImage = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !isReady) {
      console.log('Cannot capture: video not ready', { hasVideo: !!video, isReady });
      return null;
    }

    // Ensure video has dimensions
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

    // Mirror the image for selfie camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    // Add timestamp watermark
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    const timestamp = new Date().toLocaleString('pt-BR');
    ctx.fillText(timestamp, canvas.width - 10, canvas.height - 10);

    console.log('Image captured successfully');
    // Use maximum quality for face comparison
    return canvas.toDataURL('image/jpeg', 0.98);
  }, [isReady, facingMode]);

  // Track component mount state
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
    error,
    hasPermission,
    startCamera,
    stopCamera,
    captureImage,
  };
};
