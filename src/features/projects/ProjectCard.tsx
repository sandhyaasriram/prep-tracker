/**
 * Project card for existing and suggested project lists.
 */

import { ExternalLink, Github } from 'lucide-react';
import { Badge, Button, Card, CardBody } from '@/components';
import type { ProjectWithChecklist } from '@/types/projects';

interface ProjectCardProps {
  project: ProjectWithChecklist;
  onSelect: (project: ProjectWithChecklist) => void;
  onPromote?: (project: ProjectWithChecklist) => Promise<void>;
}

/**
 * Summary card for a portfolio project.
 */
export function ProjectCard({ project, onSelect, onPromote }: ProjectCardProps) {
  const checklistDone = project.checklist.filter((item) => item.completed).length;
  const checklistTotal = project.checklist.length;

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={() => onSelect(project)} className="min-w-0 text-left">
            <p className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{project.name}</p>
            <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">{project.status}</p>
          </button>
          {project.type === 'suggested' && onPromote && (
            <Button size="sm" variant="secondary" onClick={() => void onPromote(project)}>
              Promote
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {project.tech_stack.map((tech) => (
            <Badge key={tech} variant="projects">
              {tech}
            </Badge>
          ))}
        </div>

        {project.placement_relevance && (
          <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{project.placement_relevance}</p>
        )}

        {checklistTotal > 0 && (
          <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
            Resume checklist: {checklistDone}/{checklistTotal}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#5B5FEF] hover:underline dark:text-[#6B6FF5]"
            >
              <Github size={12} /> GitHub
            </a>
          )}
          {project.demo_url && (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#5B5FEF] hover:underline dark:text-[#6B6FF5]"
            >
              <ExternalLink size={12} /> Demo
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
