/**
 * Projects portfolio page.
 */

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Card, CardBody } from '@/components';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { ProjectDetailModal } from '@/features/projects/ProjectDetailModal';
import { useProjectsData } from '@/hooks/useProjectsData';
import { exportToCSV, generateCSVFilename } from '@/utils';
import type { User } from '@supabase/supabase-js';

interface ProjectsPageProps {
  user: User;
}

/**
 * Existing and suggested projects with resume checklists.
 */
export function ProjectsPage({ user }: ProjectsPageProps) {
  const { data, loading, error, updateProject, promoteProject, toggleChecklistItem } = useProjectsData(user.id);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !data) {
      return null;
    }

    return [...data.existing, ...data.suggested].find((project) => project.id === selectedProjectId) ?? null;
  }, [data, selectedProjectId]);

  const handleExport = (): void => {
    if (!data) {
      return;
    }

    const rows = [...data.existing, ...data.suggested].map((project) => ({
      name: project.name,
      type: project.type,
      status: project.status,
      tech_stack: project.tech_stack.join('; '),
      github_url: project.github_url,
      demo_url: project.demo_url,
      checklist_done: project.checklist.filter((item) => item.completed).length,
      checklist_total: project.checklist.length,
      placement_relevance: project.placement_relevance,
      notes: project.notes,
    }));

    exportToCSV(rows, generateCSVFilename('projects'));
  };

  if (loading) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading projects...</p>;
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
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Projects</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Portfolio projects, deployment links, and resume-ready checklists.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Total</p><p className="mt-1 text-2xl font-semibold">{data.stats.total}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">In progress</p><p className="mt-1 text-2xl font-semibold">{data.stats.inProgress}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Deployed</p><p className="mt-1 text-2xl font-semibold">{data.stats.deployed}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Checklist done</p><p className="mt-1 text-2xl font-semibold">{data.stats.checklistComplete}/{data.stats.checklistTotal}</p></CardBody></Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Existing projects</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.existing.map((project) => (
            <ProjectCard key={project.id} project={project} onSelect={(p) => setSelectedProjectId(p.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Suggested projects</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.suggested.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={(p) => setSelectedProjectId(p.id)}
              onPromote={async (p) => promoteProject(p.id)}
            />
          ))}
        </div>
      </section>

      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProjectId(null)}
        onUpdate={updateProject}
        onToggleChecklist={toggleChecklistItem}
      />
    </div>
  );
}
