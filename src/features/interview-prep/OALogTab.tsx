/**
 * OA log tab for Interview Prep.
 */

import { Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody } from '@/components';
import { formatDisplayDate, formatPercent } from '@/utils';
import type { OALog } from '@/types';
import type { OALogStats } from '@/types/interview-prep';

interface OALogTabProps {
  oaLogs: OALog[];
  stats: OALogStats;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Lists OA attempts with summary stats.
 */
export function OALogTab({ oaLogs, stats, onDelete }: OALogTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Total OAs</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Average solve rate</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">
              {stats.averageSolveRate !== null ? formatPercent(stats.averageSolveRate) : '—'}
            </p>
          </CardBody>
        </Card>
      </div>

      {oaLogs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E8E3DC] px-4 py-10 text-center text-sm text-[#7A736B] dark:border-[#232830] dark:text-[#6B7280]">
          No OA attempts logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E3DC] dark:border-[#232830]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F3F0EB] text-xs uppercase tracking-wide text-[#7A736B] dark:bg-[#1C2028] dark:text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Solved</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Topics</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E3DC] dark:divide-[#232830]">
              {oaLogs.map((log) => (
                <tr key={log.id} className="bg-white dark:bg-[#13161A]">
                  <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">{formatDisplayDate(log.date)}</td>
                  <td className="px-4 py-3 font-medium text-[#1A1614] dark:text-[#E8EDF2]">{log.company}</td>
                  <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">{log.platform}</td>
                  <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">
                    {log.solved}/{log.total_questions}
                    {log.total_questions > 0 && (
                      <span className="ml-1 text-xs">
                        ({formatPercent(Math.round((log.solved / log.total_questions) * 100))})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">{log.score ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {log.topics.map((topic) => (
                        <Badge key={topic} variant="interview">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void onDelete(log.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
