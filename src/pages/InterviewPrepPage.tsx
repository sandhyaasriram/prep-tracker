/**
 * Interview Prep page — mock interviews, OA log, and CS fundamentals.
 */

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components';
import { ExportMenu } from '@/features/export/ExportMenu';
import { AddMockInterviewModal } from '@/features/interview-prep/AddMockInterviewModal';
import { AddOALogModal } from '@/features/interview-prep/AddOALogModal';
import { CSFundamentalsTab } from '@/features/interview-prep/CSFundamentalsTab';
import { MockInterviewsTab } from '@/features/interview-prep/MockInterviewsTab';
import { OALogTab } from '@/features/interview-prep/OALogTab';
import { useInterviewPrepData } from '@/hooks/useInterviewPrepData';
import type { InterviewPrepTab } from '@/types/interview-prep';
import type { User } from '@supabase/supabase-js';

interface InterviewPrepPageProps {
  user: User;
}

const TABS: Array<{ id: InterviewPrepTab; label: string }> = [
  { id: 'mocks', label: 'Mock Interviews' },
  { id: 'oa', label: 'OA Log' },
  { id: 'cs', label: 'CS Fundamentals' },
];

/**
 * Interview preparation hub with tabbed sub-sections.
 */
export function InterviewPrepPage({ user }: InterviewPrepPageProps) {
  const { data, loading, error, addMockInterview, deleteMockInterview, addOALog, deleteOALog, updateCSFundamental } =
    useInterviewPrepData(user.id);

  const [activeTab, setActiveTab] = useState<InterviewPrepTab>('mocks');
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [oaModalOpen, setOaModalOpen] = useState(false);

  const exportConfig = useMemo((): { csvSection: string; sheetSectionName: string; rows: Record<string, unknown>[] } | null => {
    if (!data) {
      return null;
    }

    if (activeTab === 'mocks') {
      return {
        csvSection: 'mock-interviews',
        sheetSectionName: 'MockInterviews',
        rows: data.mocks.map((mock) => ({
          date: mock.date,
          type: mock.type,
          platform: mock.platform,
          topics: mock.topics.join('; '),
          rating: mock.rating,
          went_well: mock.went_well,
          improve: mock.improve,
        })),
      };
    }

    if (activeTab === 'oa') {
      return {
        csvSection: 'oa-log',
        sheetSectionName: 'OALog',
        rows: data.oaLogs.map((log) => ({
          date: log.date,
          company: log.company,
          platform: log.platform,
          total_questions: log.total_questions,
          solved: log.solved,
          score: log.score,
          topics: log.topics.join('; '),
          notes: log.notes,
        })),
      };
    }

    return null;
  }, [activeTab, data]);

  if (loading && !data) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading interview prep...</p>;
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
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Pressure reveals preparation.</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Mock interviews, OA history, and CS fundamentals revision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exportConfig && (
            <ExportMenu
              csvSection={exportConfig.csvSection}
              sheetSectionName={exportConfig.sheetSectionName}
              rows={exportConfig.rows}
              userEmail={user.email ?? 'your account'}
            />
          )}
          {activeTab === 'mocks' && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setMockModalOpen(true)}>
              Log mock
            </Button>
          )}
          {activeTab === 'oa' && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setOaModalOpen(true)}>
              Log OA
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E8E3DC] pb-2 dark:border-[#232830]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#5B5FEF] text-white'
                : 'text-[#7A736B] hover:bg-[#F3F0EB] dark:text-[#6B7280] dark:hover:bg-[#1C2028]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'mocks' && (
        <MockInterviewsTab mocks={data.mocks} stats={data.mockStats} onDelete={deleteMockInterview} />
      )}
      {activeTab === 'oa' && <OALogTab oaLogs={data.oaLogs} stats={data.oaStats} onDelete={deleteOALog} />}
      {activeTab === 'cs' && <CSFundamentalsTab groups={data.csGroups} onUpdate={updateCSFundamental} />}

      <AddMockInterviewModal isOpen={mockModalOpen} onClose={() => setMockModalOpen(false)} onSubmit={addMockInterview} />
      <AddOALogModal isOpen={oaModalOpen} onClose={() => setOaModalOpen(false)} onSubmit={addOALog} />
    </div>
  );
}
