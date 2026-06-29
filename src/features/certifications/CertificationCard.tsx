/**
 * Certification card with inline progress editing.
 */

import { Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, Input } from '@/components';
import { formatDisplayDate } from '@/utils';
import type { Certification, CertificationStatus } from '@/types';
import type { UpdateCertificationInput } from '@/types/certifications';

interface CertificationCardProps {
  certification: Certification;
  onUpdate: (id: string, input: UpdateCertificationInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Editable certification entry card.
 */
export function CertificationCard({ certification, onUpdate, onDelete }: CertificationCardProps) {
  const handleProgressChange = (value: string): void => {
    void onUpdate(certification.id, { progress: Number(value) });
  };

  const handleStatusChange = (status: CertificationStatus): void => {
    const payload: UpdateCertificationInput = { status };
    if (status === 'Completed') {
      payload.progress = 100;
    }
    void onUpdate(certification.id, payload);
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{certification.name}</p>
              <Badge variant="certifications">{certification.provider}</Badge>
            </div>
            {certification.target_date && (
              <p className="mt-1 text-xs text-[#7A736B] dark:text-[#6B7280]">
                Target: {formatDisplayDate(certification.target_date)}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void onDelete(certification.id)}>
            Delete
          </Button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-[#7A736B] dark:text-[#6B7280]">Status</span>
          <select
            value={certification.status}
            onChange={(event) => handleStatusChange(event.target.value as CertificationStatus)}
            className="input-base"
          >
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>

        {certification.status === 'In Progress' && (
          <label className="block space-y-2">
            <div className="flex items-center justify-between text-xs text-[#7A736B] dark:text-[#6B7280]">
              <span>Progress</span>
              <span>{certification.progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={certification.progress}
              onChange={(event) => handleProgressChange(event.target.value)}
              className="w-full accent-[#5B5FEF]"
            />
          </label>
        )}

        <Input
          label="Certificate URL"
          value={certification.cert_url}
          onBlur={(event) => {
            if (event.target.value !== certification.cert_url) {
              void onUpdate(certification.id, { certUrl: event.target.value });
            }
          }}
          placeholder="https://..."
        />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea
            defaultValue={certification.notes}
            onBlur={(event) => {
              if (event.target.value !== certification.notes) {
                void onUpdate(certification.id, { notes: event.target.value });
              }
            }}
            rows={2}
            className="input-base resize-y"
          />
        </label>
      </CardBody>
    </Card>
  );
}
