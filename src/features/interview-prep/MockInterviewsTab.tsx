/**
 * Mock interviews tab for Interview Prep.
 */

import { Star, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody } from '@/components';
import { formatDisplayDate } from '@/utils';
import type { MockInterview } from '@/types';
import type { MockInterviewStats } from '@/types/interview-prep';

interface MockInterviewsTabProps {
  mocks: MockInterview[];
  stats: MockInterviewStats;
  onDelete: (id: string) => Promise<void>;
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-xs text-[#7A736B] dark:text-[#6B7280]">Unrated</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[#D4941A]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={12} fill={index < rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

/**
 * Lists mock interviews with summary stats.
 */
export function MockInterviewsTab({ mocks, stats, onDelete }: MockInterviewsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Total mocks</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Average rating</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">
              {stats.averageRating ?? '—'}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Most common weak area</p>
            <p className="mt-1 text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{stats.weakestArea ?? '—'}</p>
          </CardBody>
        </Card>
      </div>

      {mocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E8E3DC] px-4 py-10 text-center text-sm text-[#7A736B] dark:border-[#232830] dark:text-[#6B7280]">
          No mock interviews logged yet.
        </p>
      ) : (
        <div className="space-y-3">
          {mocks.map((mock) => (
            <Card key={mock.id}>
              <CardBody className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="interview">{mock.type}</Badge>
                    <span className="text-sm text-[#7A736B] dark:text-[#6B7280]">{formatDisplayDate(mock.date)}</span>
                    <StarRating rating={mock.rating} />
                  </div>
                  <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{mock.platform}</p>
                  {mock.topics.length > 0 && (
                    <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">Topics: {mock.topics.join(', ')}</p>
                  )}
                  {mock.went_well && (
                    <p className="text-sm text-[#1A1614] dark:text-[#E8EDF2]">
                      <span className="text-[#7A736B] dark:text-[#6B7280]">Went well:</span> {mock.went_well}
                    </p>
                  )}
                  {mock.improve && (
                    <p className="text-sm text-[#1A1614] dark:text-[#E8EDF2]">
                      <span className="text-[#7A736B] dark:text-[#6B7280]">Improve:</span> {mock.improve}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void onDelete(mock.id)}>
                  Delete
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
