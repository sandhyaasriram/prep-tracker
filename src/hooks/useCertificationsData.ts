/**
 * Certifications data hook.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
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
  refresh: (options?: { silent?: boolean }) => Promise<void>;
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
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setCertifications([]);
      setLoading(false);
      resetHydrated(hydratedRef);
      return;
    }

    if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
      setLoading(true);
    }
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

      const next = (data ?? []) as Certification[];
      setCertifications(next);    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      if (!hydratedRef.current) {
        setCertifications([]);
      }
    } finally {
      markHydrated(hydratedRef);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    resetHydrated(hydratedRef);
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
      if (!userId) throw new Error('Not authenticated');

      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: Certification = {
        id: tempId,
        user_id: userId,
        name: input.name.trim(),
        provider: input.provider.trim(),
        status: input.status,
        target_date: input.targetDate ?? null,
        progress: input.progress ?? (input.status === 'Completed' ? 100 : 0),
        cert_url: input.certUrl?.trim() ?? '',
        notes: input.notes?.trim() ?? '',
        created_at: now,
        updated_at: now,
      };
      const previous = certifications;

      await runOptimisticMutation({
        apply: () => {
          const next = [...certifications, optimistic];
          setCertifications(next);        },
        revert: () => {
          setCertifications(previous);        },
        persist: async () => {
          const { data: inserted, error: insertError } = await supabase
            .from('certifications')
            .insert([
              {
                user_id: userId,
                name: optimistic.name,
                provider: optimistic.provider,
                status: optimistic.status,
                target_date: optimistic.target_date,
                progress: optimistic.progress,
                cert_url: optimistic.cert_url,
                notes: optimistic.notes,
              },
            ])
            .select('*')
            .single();
          if (insertError) throw insertError;
          setCertifications((current) => {
            const next = current.map((cert) => (cert.id === tempId ? (inserted as Certification) : cert));            return next;
          });
        },
        errorMessage: 'Could not add certification.',
      });
    },
    [certifications, userId]
  );

  const updateCertification = useCallback(
    async (id: string, input: UpdateCertificationInput): Promise<void> => {
      const previous = certifications;
      const optimistic = certifications.map((cert) => {
        if (cert.id !== id) return cert;

        const nextStatus = input.status !== undefined ? input.status : cert.status;
        let nextProgress = input.progress !== undefined ? input.progress : cert.progress;
        if (nextStatus === 'Completed' && input.progress === undefined) {
          nextProgress = 100;
        }

        return {
          ...cert,
          name: input.name !== undefined ? input.name.trim() : cert.name,
          provider: input.provider !== undefined ? input.provider.trim() : cert.provider,
          status: nextStatus,
          target_date: input.targetDate !== undefined ? input.targetDate : cert.target_date,
          progress: nextProgress,
          cert_url: input.certUrl !== undefined ? input.certUrl.trim() : cert.cert_url,
          notes: input.notes !== undefined ? input.notes.trim() : cert.notes,
        };
      });

      await runOptimisticMutation({
        apply: () => {
          setCertifications(optimistic);        },
        revert: () => {
          setCertifications(previous);        },
        persist: async () => {
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
          if (updateError) throw updateError;
        },
        errorMessage: 'Could not update certification.',
      });
    },
    [certifications]
  );

  const deleteCertification = useCallback(
    async (id: string): Promise<void> => {
      const previous = certifications;
      const optimistic = certifications.filter((cert) => cert.id !== id);

      await runOptimisticMutation({
        apply: () => {
          setCertifications(optimistic);        },
        revert: () => {
          setCertifications(previous);        },
        persist: async () => {
          const { error: deleteError } = await supabase.from('certifications').delete().eq('id', id);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete certification.',
      });
    },
    [certifications]
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
