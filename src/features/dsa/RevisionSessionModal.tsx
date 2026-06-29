/**
 * Timed revision session modal for flagged or due DSA problems.
 */

import { useEffect, useMemo, useState } from 'react';
import { Clock3, ExternalLink, SkipForward, Square, Trophy } from 'lucide-react';
import { Badge, Button, Modal } from '@/components';
import type { DSAProblemSummary } from '@/types/dsa';

interface RevisionSessionModalProps {
  isOpen: boolean;
  problems: DSAProblemSummary[];
  minutesPerProblem: number;
  onClose: () => void;
  onMarkSolved: (problemId: string) => Promise<void>;
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Guides the user through a timed revision queue one problem at a time.
 */
export function RevisionSessionModal({
  isOpen,
  problems,
  minutesPerProblem,
  onClose,
  onMarkSolved,
}: RevisionSessionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(minutesPerProblem * 60);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const currentProblem = problems[currentIndex] ?? null;
  const isComplete = problems.length === 0 || currentIndex >= problems.length;

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setSecondsRemaining(minutesPerProblem * 60);
      setCompletedIds([]);
      return;
    }

    setSecondsRemaining(minutesPerProblem * 60);
  }, [isOpen, minutesPerProblem, currentIndex]);

  useEffect(() => {
    if (!isOpen || isComplete) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, isComplete]);

  const progressLabel = useMemo(() => {
    if (problems.length === 0) return '0 / 0';
    return `${Math.min(currentIndex + 1, problems.length)} / ${problems.length}`;
  }, [currentIndex, problems.length]);

  const handleNext = (): void => {
    setCurrentIndex((index) => index + 1);
  };

  const handleMarkDone = async (): Promise<void> => {
    if (!currentProblem) return;

    if (!currentProblem.solved) {
      await onMarkSolved(currentProblem.id);
    }

    setCompletedIds((current) => [...current, currentProblem.id]);
    handleNext();
  };

  const handleSkip = (): void => {
    handleNext();
  };

  const handleEndSession = (): void => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleEndSession}
      title="Revision session"
      size="lg"
      footer={
        !isComplete ? (
          <>
            <Button variant="secondary" size="sm" icon={<SkipForward size={14} />} onClick={handleSkip}>
              Skip
            </Button>
            <Button variant="secondary" size="sm" icon={<Square size={14} />} onClick={handleEndSession}>
              End session
            </Button>
            <Button size="sm" icon={<Trophy size={14} />} onClick={() => handleMarkDone()}>
              Mark done & next
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleEndSession}>
            Close
          </Button>
        )
      }
    >
      {problems.length === 0 ? (
        <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Nothing is in your revision queue right now.</p>
      ) : isComplete ? (
        <div className="space-y-3 text-center">
          <Trophy className="mx-auto text-[#2D7A4F]" size={28} />
          <p className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">Revision session complete</p>
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
            You worked through {completedIds.length} of {problems.length} problems.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DC] bg-[#F3F0EB] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] dark:bg-[#1C2028]">
              Problem {progressLabel}
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">
              <Clock3 size={16} className="text-[#E8622A]" />
              {formatTimer(secondsRemaining)}
            </div>
          </div>

          {currentProblem && (
            <div className="space-y-3 rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] p-5 dark:border-[#232830] dark:bg-[#1C2028]">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl text-[#1A1614] dark:text-[#E8EDF2]">{currentProblem.name}</h3>
                <Badge variant="difficulty" difficulty={currentProblem.difficulty}>
                  {currentProblem.difficulty}
                </Badge>
                <Badge variant="dsa">{currentProblem.topicName}</Badge>
              </div>
              <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
                Focus for {minutesPerProblem} minutes. Re-derive the approach, then code without looking at old notes.
              </p>
              {currentProblem.leetcodeUrl && (
                <a
                  href={currentProblem.leetcodeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#5B5FEF] hover:underline"
                >
                  Open on LeetCode <ExternalLink size={14} />
                </a>
              )}
              {currentProblem.notes && (
                <div className="rounded-xl border border-[#E8E3DC] bg-white p-3 text-sm text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] dark:bg-[#13161A]">
                  {currentProblem.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
