/**
 * Route content wrapper — subtle enter animation (respects reduced motion via CSS).
 */

import type { ReactNode } from 'react';

interface PageContentProps {
  routeKey: string;
  children: ReactNode;
}

export function PageContent({ routeKey, children }: PageContentProps) {
  return (
    <div key={routeKey} className="page-enter">
      {children}
    </div>
  );
}
