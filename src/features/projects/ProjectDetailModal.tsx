/**
 * Detail modal for editing a project and its resume checklist.
 */

import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '@/components';
import { PROJECT_STATUS } from '@/constants';
import type { ProjectStatus } from '@/types';
import type { ProjectWithChecklist, UpdateProjectInput } from '@/types/projects';

interface ProjectDetailModalProps {
  project: ProjectWithChecklist | null;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateProjectInput) => Promise<void>;
  onToggleChecklist: (itemId: string, completed: boolean) => Promise<void>;
}

const STATUS_OPTIONS = Object.values(PROJECT_STATUS);

/**
 * Full project editor with checklist toggles.
 */
export function ProjectDetailModal({ project, onClose, onUpdate, onToggleChecklist }: ProjectDetailModalProps) {
  const [status, setStatus] = useState<ProjectStatus>('In Progress');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    setStatus(project.status);
    setGithubUrl(project.github_url);
    setDemoUrl(project.demo_url);
    setNotes(project.notes);
    setError(null);
  }, [project]);

  if (!project) {
    return null;
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      await onUpdate(project.id, { status, githubUrl, demoUrl, notes });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(project)}
      onClose={onClose}
      title={project.name}
      size="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{project.placement_relevance}</p>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="input-base">
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="GitHub URL" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/..." />
          <Input label="Demo URL" value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} placeholder="https://..." />
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="input-base resize-y" />
        </label>

        {project.checklist.length > 0 && (
          <div className="rounded-xl border border-[#E8E3DC] p-4 dark:border-[#232830]">
            <h3 className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Resume-ready checklist</h3>
            <ul className="mt-3 space-y-2">
              {project.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(event) => void onToggleChecklist(item.id, event.target.checked)}
                    className="h-4 w-4 rounded border-[#E8E3DC] text-[#5B5FEF] focus:ring-[#5B5FEF] dark:border-[#232830]"
                  />
                  <span className={`text-sm ${item.completed ? 'text-[#7A736B] line-through dark:text-[#6B7280]' : 'text-[#1A1614] dark:text-[#E8EDF2]'}`}>
                    {item.item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
