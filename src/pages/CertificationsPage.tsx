/**
 * Certifications tracker page.
 */

import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Button, Card, CardBody } from '@/components';
import { AddCertificationModal } from '@/features/certifications/AddCertificationModal';
import { CertificationCard } from '@/features/certifications/CertificationCard';
import { useCertificationsData } from '@/hooks/useCertificationsData';
import { exportToCSV, generateCSVFilename } from '@/utils';
import type { User } from '@supabase/supabase-js';

interface CertificationsPageProps {
  user: User;
}

/**
 * In-progress and completed certifications with progress tracking.
 */
export function CertificationsPage({ user }: CertificationsPageProps) {
  const { data, loading, error, addCertification, updateCertification, deleteCertification } = useCertificationsData(user.id);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleExport = (): void => {
    if (!data) {
      return;
    }

    const rows = [...data.inProgress, ...data.completed].map((cert) => ({
      name: cert.name,
      provider: cert.provider,
      status: cert.status,
      target_date: cert.target_date,
      progress: cert.progress,
      cert_url: cert.cert_url,
      notes: cert.notes,
    }));

    exportToCSV(rows, generateCSVFilename('certifications'));
  };

  if (loading) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading certifications...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#E8622A]/30 bg-[#E8622A]/5 px-4 py-3 text-sm text-[#1A1614] dark:text-[#E8EDF2]">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Certifications</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Track exam prep, module progress, and completed credentials.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
            Export CSV
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddModalOpen(true)}>
            Add certification
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Total</p><p className="mt-1 text-2xl font-semibold">{data.stats.total}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">In progress</p><p className="mt-1 text-2xl font-semibold">{data.stats.inProgressCount}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Completed</p><p className="mt-1 text-2xl font-semibold">{data.stats.completedCount}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Avg progress</p><p className="mt-1 text-2xl font-semibold">{data.stats.averageProgress ?? '—'}%</p></CardBody></Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">In progress</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.inProgress.map((cert) => (
            <CertificationCard key={cert.id} certification={cert} onUpdate={updateCertification} onDelete={deleteCertification} />
          ))}
          {data.inProgress.length === 0 && (
            <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">No certifications in progress.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Completed</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.completed.map((cert) => (
            <CertificationCard key={cert.id} certification={cert} onUpdate={updateCertification} onDelete={deleteCertification} />
          ))}
        </div>
      </section>

      <AddCertificationModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={addCertification} />
    </div>
  );
}
