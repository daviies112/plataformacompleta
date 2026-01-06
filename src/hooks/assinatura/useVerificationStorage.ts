import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VerificationResult } from '@/types/verification';

export interface StoredVerification {
  id: string;
  created_at: string;
  passed: boolean;
  confidence: string;
  similarity_score: number;
  required_score: number;
  selfie_quality: number;
  document_quality: number;
  euclidean_score: number;
  cosine_score: number;
  landmark_score: number;
  structural_score: number;
  texture_score: number;
  histogram_score: number;
  triplet_score: number;
  arcface_score: number;
  cosface_score: number;
  sphereface_score: number;
  ensemble_score: number;
  euclidean_distance: number;
  cosine_distance: number;
  agreement_count: number;
  adaptive_threshold: number;
}

export const useVerificationStorage = () => {
  const saveVerification = useCallback(async (
    result: VerificationResult,
    deviceInfo?: string
  ): Promise<{ id: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('face_verifications')
        .insert({
          passed: result.passed,
          confidence: result.confidence || 'low',
          similarity_score: result.score,
          required_score: result.requiredScore || 0,
          selfie_quality: result.selfieQuality,
          document_quality: result.documentQuality,
          euclidean_score: result.metrics?.euclidean,
          cosine_score: result.metrics?.cosine,
          landmark_score: result.metrics?.landmarks,
          structural_score: result.metrics?.structural,
          texture_score: result.metrics?.texture,
          histogram_score: result.metrics?.histogram,
          triplet_score: result.metrics?.tripletScore,
          arcface_score: result.metrics?.arcfaceScore,
          cosface_score: result.metrics?.cosfaceScore,
          sphereface_score: result.metrics?.spherefaceScore,
          ensemble_score: result.metrics?.ensembleScore,
          euclidean_distance: result.metrics?.euclideanDistance,
          cosine_distance: result.metrics?.cosineDistance,
          agreement_count: result.ensembleAgreement,
          adaptive_threshold: result.adaptiveThreshold,
          device_info: deviceInfo || navigator.userAgent,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving verification:', error);
        return null;
      }

      console.log('Verification saved with ID:', data.id);
      return { id: data.id };
    } catch (err) {
      console.error('Failed to save verification:', err);
      return null;
    }
  }, []);

  const getVerification = useCallback(async (id: string): Promise<StoredVerification | null> => {
    try {
      const { data, error } = await supabase
        .from('face_verifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching verification:', error);
        return null;
      }

      return data as StoredVerification;
    } catch (err) {
      console.error('Failed to fetch verification:', err);
      return null;
    }
  }, []);

  const getRecentVerifications = useCallback(async (limit: number = 10): Promise<StoredVerification[]> => {
    try {
      const { data, error } = await supabase
        .from('face_verifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching verifications:', error);
        return [];
      }

      return data as StoredVerification[];
    } catch (err) {
      console.error('Failed to fetch verifications:', err);
      return [];
    }
  }, []);

  const getVerificationStats = useCallback(async (): Promise<{
    total: number;
    passed: number;
    failed: number;
    avgScore: number;
  }> => {
    try {
      const { data, error } = await supabase
        .from('face_verifications')
        .select('passed, similarity_score');

      if (error || !data) {
        return { total: 0, passed: 0, failed: 0, avgScore: 0 };
      }

      const total = data.length;
      const passed = data.filter(v => v.passed).length;
      const failed = total - passed;
      const avgScore = total > 0 
        ? data.reduce((sum, v) => sum + (v.similarity_score || 0), 0) / total 
        : 0;

      return { total, passed, failed, avgScore: Math.round(avgScore) };
    } catch (err) {
      console.error('Failed to get stats:', err);
      return { total: 0, passed: 0, failed: 0, avgScore: 0 };
    }
  }, []);

  return {
    saveVerification,
    getVerification,
    getRecentVerifications,
    getVerificationStats,
  };
};
