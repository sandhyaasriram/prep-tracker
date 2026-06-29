/**
 * Color-coded stage badge for application pipeline cards.
 */

import type { ApplicationStage } from '@/types';
import { stageBadgeStyles } from './stageStyles';

interface ApplicationStageBadgeProps {
  stage: ApplicationStage;
}

/**
 * Renders a pill badge for an application stage.
 */
export function ApplicationStageBadge({ stage }: ApplicationStageBadgeProps) {
  const style = stageBadgeStyles[stage];

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {stage}
    </span>
  );
}
