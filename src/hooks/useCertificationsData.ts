/**
 * Certifications data hook.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import type { Certification } from '@/types';
import type {
  AddCertificationInput,
  CertificationsViewData,
  UpdateCertificationInput,
} from '@/types/certifications';

interface UseCertificationsDataResult {
  data: CertificationsViewData | null;
  loading: boolean;
  error: string | null;
  addCertification: (input: AddCertificationInput) => Promise<void>;
  updateCertification: (id: string, input: UpdateCertificationInput) => Promise<void>;
  deleteCertification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function buildStats(certifications: Certification[]): CertificationsViewData['stats'] {
  const inProgress = certifications.filter((cert) => cert.status === 'In Progress');
  const completed = certifications.filter((cert) => cert.status === 'Completed');

  let averageProgress: number | null = null;

  if (inProgress.length > 0) {
    const sum = inProgress.reduce((total, cert) => total + cert.progress, 0);
    averageProgress = Math.round(sum / inProgress.length);
  }

  return {
    total: certifications.length,
    inProgressCount: inProgress.length,
    completedCount: completed.length,
    averageProgress,
  };
}

/**
 * Load and manage certification progress.
 */
export function useCertificationsData(userId: string | null): UseCertificationsDataResult {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setCertifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .order('status', { ascending: true })
        .order('target_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setCertifications((data ?? []) as Certification[]);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setCertifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const data = useMemo((): CertificationsViewData | null => {
    if (!userId) {
      return null;
    }

    return {
      inProgress: certifications.filter((cert) => cert.status === 'In Progress'),
      completed: certifications.filter((cert) => cert.status === 'Completed'),
      stats: buildStats(certifications),
    };
  }, [certifications, userId]);

  const addCertification = useCallback(
    async (input: AddCertificationInput): Promise<void> => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const payload = {
        user_id: userId,
        name: input.name.trim(),
        provider: input.provider.trim(),
        status: input.status,
        target_date: input.targetDate ?? null,
        progress: input.progress ?? (input.status === 'Completed' ? 100 : 0),
        cert_url: input.certUrl?.trim() ?? '',
        notes: input.notes?.trim() ?? '',
      };

      const { error: insertError } = await supabase.from('certifications').insert([payload]);

      if (insertError) {
        throw new Error(formatSupabaseError(insertError));
      }

      await fetchData();
    },
    [userId, fetchData]
  );

  const updateCertification = useCallback(
    async (id: string, input: UpdateCertificationInput): Promise<void> => {
      const payload: Record<string, unknown> = {};

      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.provider !== undefined) payload.provider = input.provider.trim();
      if (input.status !== undefined) payload.status = input.status;
      if (input.targetDate !== undefined) payload.target_date = input.targetDate;
      if (input.progress !== undefined) payload.progress = input.progress;
      if (input.certUrl !== undefined) payload.cert_url = input.certUrl.trim();
      if (input.notes !== undefined) payload.notes = input.notes.trim();

      if (input.status === 'Completed' && input.progress === undefined) {
        payload.progress = 100;
      }

      const { error: updateError } = await supabase.from('certifications').update(payload).eq('id', id);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const deleteCertification = useCallback(
    async (id: string): Promise<void> => {
      const { error: deleteError } = await supabase.from('certifications').delete().eq('id', id);

      if (deleteError) {
        throw new Error(formatSupabaseError(deleteError));
      }

      await fetchData();
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    addCertification,
    updateCertification,
    deleteCertification,
    refresh: fetchData,
  };
}
