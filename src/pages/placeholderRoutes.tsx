/**
 * Lightweight placeholder route screens for future phases.
 * These keep the app navigable without wiring each section fully yet.
 */

import type { User } from '@supabase/supabase-js';
import { Card, CardBody } from '@/components';

interface PlaceholderPageProps {
  title: string;
  description: string;
  user: User;
}

export function PlaceholderPage({ title, description, user }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <Card elevated>
        <CardBody className="space-y-3 p-6">
          <h1 className="font-display text-4xl text-[#1A1614] dark:text-[#E8EDF2]">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-[#7A736B] dark:text-[#6B7280]">{description}</p>
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Signed in as {user.email}</p>
        </CardBody>
      </Card>
    </div>
  );
}
