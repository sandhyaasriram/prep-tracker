/**
 * Create-project modal for adding new portfolio entries.
 */

import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '@/components';
import { PROJECT_STATUS } from '@/constants';
import type { ProjectStatus } from '@/types';
import type { CreateProjectInput } from '@/types/projects';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  createProject: (input: CreateProjectInput) => Promise<void>;
}

const STATUS_OPTIONS = Object.values(PROJECT_STATUS);

/**
 * Modal form used to create a new existing project.
 */
export function ProjectCreateModal({ isOpen, onClose, createProject }: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [techStackRaw, setTechStackRaw] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Planning');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [placementRelevance, setPlacementRelevance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setName('');
    setTechStackRaw('');
    setStatus('Planning');
    setGithubUrl('');
    setDemoUrl('');
    setPlacementRelevance('');
    setNotes('');
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const handleCreate = async (): Promise<void> => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    const techStack = techStackRaw
      .split(',')
      .map((tech) => tech.trim())
      .filter(Boolean);

    setSaving(true);
    setError(null);

    try {
      await createProject({
        name: trimmedName,
        techStack,
        status,
        githubUrl,
        demoUrl,
        placementRelevance,
        notes,
      });
      handleClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add project"
      size="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void handleCreate()}>
            Create project
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          required
        />

        <Input
          label="Tech stack"
          value={techStackRaw}
          onChange={(event) => setTechStackRaw(event.target.value)}
          placeholder="Comma-separated, e.g. Python, React, PostgreSQL"
        />

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
          <Input
            label="GitHub URL"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="https://github.com/..."
          />
          <Input
            label="Demo URL"
            value={demoUrl}
            onChange={(event) => setDemoUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Placement relevance</span>
          <textarea
            value={placementRelevance}
            onChange={(event) => setPlacementRelevance(event.target.value)}
            rows={3}
            className="input-base resize-y"
            placeholder="Why this project matters for your target roles"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="input-base resize-y" />
        </label>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
