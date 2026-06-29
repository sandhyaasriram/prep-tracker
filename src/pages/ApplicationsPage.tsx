/**
 * Applications page — pipeline kanban + table with filters and CSV export.
 */

import { useCallback, useMemo, useState } from 'react';
import { LayoutGrid, Plus, Table2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, Input } from '@/components';
import { ExportMenu } from '@/features/export/ExportMenu';
import { AddApplicationModal } from '@/features/applications/AddApplicationModal';
import { ApplicationDetailModal } from '@/features/applications/ApplicationDetailModal';
import { ApplicationKanban } from '@/features/applications/ApplicationKanban';
import { ApplicationTable } from '@/features/applications/ApplicationTable';
import { useApplicationsData } from '@/hooks/useApplicationsData';
import { APPLICATION_SOURCES, APPLICATION_STAGE_ORDER } from '@/constants';
import type { User } from '@supabase/supabase-js';
import type { ApplicationFilters } from '@/types/applications';
import type { ApplicationSource, ApplicationStage } from '@/types';

interface ApplicationsPageProps {
  user: User;
}

type ViewMode = 'kanban' | 'table';

/**
 * Application pipeline tracker with kanban and table views.
 */
export function ApplicationsPage({ user }: ApplicationsPageProps) {
  const {
    data,
    loading,
    error,
    filters,
    setFilters,
    addApplication,
    updateApplication,
    deleteApplication,
    updateStage,
    addInterviewRound,
    deleteInterviewRound,
  } = useApplicationsData(user.id);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const selectedApplication = useMemo(() => {
    if (!selectedApplicationId || !data) {
      return null;
    }

    return data.allApplications.find((app) => app.id === selectedApplicationId) ?? null;
  }, [data, selectedApplicationId]);

  const handleFilterChange = useCallback(
    (partial: Partial<ApplicationFilters>): void => {
      setFilters({ ...filters, ...partial });
    },
    [filters, setFilters]
  );

  const exportRows = useMemo((): Record<string, unknown>[] => {
    if (!data) {
      return [];
    }

    return data.applications.map((app) => ({
      company: app.company,
      role: app.role,
      stage: app.stage,
      source: app.source,
      date_applied: app.date_applied,
      next_deadline: app.next_deadline,
      oa_score: app.oa_score,
      interview_rounds: app.rounds.length,
      notes: app.notes,
    }));
  }, [data]);

  if (loading && !data) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading applications...</p>;
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
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Every opportunity accounted for.</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Track your pipeline from wishlist through offer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
            size="sm"
            icon={<LayoutGrid size={14} />}
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'secondary'}
            size="sm"
            icon={<Table2 size={14} />}
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <ExportMenu
            csvSection="applications"
            sheetSectionName="Applications"
            rows={exportRows}
            userEmail={user.email ?? 'your account'}
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddModalOpen(true)}>
            Add application
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardBody className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Total</p>
            <p className="text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.stats.total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Active</p>
            <p className="text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.stats.active}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Offers</p>
            <p className="text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.stats.offers}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Upcoming deadlines</p>
            <p className="text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.stats.upcomingDeadlines}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#7A736B] dark:text-[#6B7280]">Stage</span>
              <select
                value={filters.stage}
                onChange={(event) => handleFilterChange({ stage: event.target.value as ApplicationStage | 'All' })}
                className="input-base"
              >
                <option value="All">All stages</option>
                {APPLICATION_STAGE_ORDER.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#7A736B] dark:text-[#6B7280]">Source</span>
              <select
                value={filters.source}
                onChange={(event) => handleFilterChange({ source: event.target.value as ApplicationSource | 'All' })}
                className="input-base"
              >
                <option value="All">All sources</option>
                {Object.values(APPLICATION_SOURCES).map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="Applied from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => handleFilterChange({ dateFrom: event.target.value })}
            />
            <Input
              label="Applied to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => handleFilterChange({ dateTo: event.target.value })}
            />
          </div>

          {data.applications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STAGE_ORDER.map((stage) => {
                const count = data.applications.filter((app) => app.stage === stage).length;
                if (count === 0) return null;
                return (
                  <Badge key={stage} variant="applications">
                    {stage}: {count}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {viewMode === 'kanban' ? (
        <ApplicationKanban
          applications={data.applications}
          onSelect={(app) => setSelectedApplicationId(app.id)}
          onStageChange={updateStage}
        />
      ) : (
        <ApplicationTable applications={data.applications} onSelect={(app) => setSelectedApplicationId(app.id)} />
      )}

      <AddApplicationModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={addApplication} />

      <ApplicationDetailModal
        application={selectedApplication}
        onClose={() => setSelectedApplicationId(null)}
        onUpdate={updateApplication}
        onDelete={deleteApplication}
        onAddRound={addInterviewRound}
        onDeleteRound={deleteInterviewRound}
      />
    </div>
  );
}
