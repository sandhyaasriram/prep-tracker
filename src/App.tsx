/**
 * Root App component for Placement OS.
 * Manages authentication state, seeding, and phase-based screen switching.
 */

import { LoginPage } from '@/pages/LoginPage';
import { MissionControlPage } from '@/pages/MissionControlPage';
import { DSAPage } from '@/pages/DSAPage';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { InterviewPrepPage } from '@/pages/InterviewPrepPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { CertificationsPage } from '@/pages/CertificationsPage';
import { JournalPage } from '@/pages/JournalPage';
import { WeeklyReviewPage } from '@/pages/WeeklyReviewPage';
import { TimelinePage } from '@/pages/TimelinePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { GoogleOAuthCallbackPage } from '@/pages/GoogleOAuthCallbackPage';
import { MainLayout, type AppNavRoute } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useNavProgress } from '@/hooks/useNavProgress';
import { useSeedUserData } from '@/hooks/useSeedUserData';
import { useEffect, useState } from 'react';

type HashRoute =
  | ''
  | 'dsa'
  | 'applications'
  | 'interview-prep'
  | 'projects'
  | 'certifications'
  | 'journal'
  | 'weekly-review'
  | 'timeline'
  | 'settings';

export default function App() {
  const isGoogleCallback =
    window.location.pathname === '/auth/google/callback' ||
    window.location.pathname === '//auth/google/callback';
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { seeding, error: seedError, retry: retrySeed, dismissError: dismissSeedError } = useSeedUserData(user?.id ?? null);
  const [route, setRoute] = useState<AppNavRoute>('Dashboard');
  const [seedErrorDismissed, setSeedErrorDismissed] = useState(false);
  const { progress: navProgress, label: navProgressLabel } = useNavProgress(user?.id ?? null, route);

  useEffect(() => {
    const syncRoute = (): void => {
      const hash = window.location.hash.replace('#', '') as HashRoute;
      if (hash === 'dsa') {
        setRoute('DSA');
        return;
      }

      if (hash === 'applications') {
        setRoute('Applications');
        return;
      }

      if (hash === 'interview-prep') {
        setRoute('Interview Prep');
        return;
      }

      if (hash === 'projects') {
        setRoute('Projects');
        return;
      }

      if (hash === 'certifications') {
        setRoute('Certifications');
        return;
      }

      if (hash === 'journal') {
        setRoute('Journal');
        return;
      }

      if (hash === 'weekly-review') {
        setRoute('Weekly Review');
        return;
      }

      if (hash === 'timeline') {
        setRoute('Timeline');
        return;
      }

      if (hash === 'settings') {
        setRoute('Settings');
        return;
      }

      setRoute('Dashboard');
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  if (isGoogleCallback) {
    return <GoogleOAuthCallbackPage />;
  }

  if (loading || seeding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] dark:bg-[#0D0F12]">
        <div className="space-y-3 text-center">
          <h1 className="font-display text-4xl text-[#1A1614] dark:text-[#E8EDF2]">Placement OS</h1>
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{loading ? 'Checking authentication...' : 'Seeding your workspace...'}</p>
        </div>
      </div>
    );
  }

  if (seedError && !seedErrorDismissed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-6 dark:bg-[#0D0F12]">
        <div className="max-w-lg rounded-2xl border border-[#E8622A]/30 bg-white p-6 text-left shadow-sm dark:border-[#E8622A]/30 dark:bg-[#13161A]">
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Placement OS</h1>
          <p className="mt-3 text-sm text-[#7A736B] dark:text-[#6B7280]">Seeding hit a problem:</p>
          <p className="mt-2 rounded-xl border border-[#E8622A]/20 bg-[#E8622A]/5 px-3 py-2 text-sm text-[#1A1614] dark:text-[#E8EDF2]">
            {seedError}
          </p>
          <p className="mt-3 text-sm text-[#7A736B] dark:text-[#6B7280]">
            If this is your first setup, open the Supabase SQL editor and run <code className="font-mono text-xs">supabase/schema.sql</code>, then retry.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSeedErrorDismissed(false);
                retrySeed();
              }}
            >
              Retry seeding
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                dismissSeedError();
                setSeedErrorDismissed(true);
              }}
            >
              Continue anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />;
  }

  const renderRoute = (): JSX.Element => {
    switch (route) {
      case 'DSA':
        return <DSAPage user={user} />;
      case 'Applications':
        return <ApplicationsPage user={user} />;
      case 'Interview Prep':
        return <InterviewPrepPage user={user} />;
      case 'Projects':
        return <ProjectsPage user={user} />;
      case 'Certifications':
        return <CertificationsPage user={user} />;
      case 'Journal':
        return <JournalPage user={user} />;
      case 'Weekly Review':
        return <WeeklyReviewPage user={user} />;
      case 'Timeline':
        return <TimelinePage user={user} />;
      case 'Settings':
        return <SettingsPage user={user} />;
      case 'Dashboard':
      default:
        return <MissionControlPage user={user} />;
    }
  };

  return (
    <MainLayout
      user={user}
      progressPercentage={navProgress}
      progressLabel={navProgressLabel}
      onSignOut={signOut}
      activeRoute={route}
      onNavigate={(nextRoute) => {
        if (nextRoute === 'DSA') {
          window.location.hash = 'dsa';
          return;
        }
        if (nextRoute === 'Applications') {
          window.location.hash = 'applications';
          return;
        }
        if (nextRoute === 'Interview Prep') {
          window.location.hash = 'interview-prep';
          return;
        }
        if (nextRoute === 'Projects') {
          window.location.hash = 'projects';
          return;
        }
        if (nextRoute === 'Certifications') {
          window.location.hash = 'certifications';
          return;
        }
        if (nextRoute === 'Journal') {
          window.location.hash = 'journal';
          return;
        }
        if (nextRoute === 'Weekly Review') {
          window.location.hash = 'weekly-review';
          return;
        }
        if (nextRoute === 'Timeline') {
          window.location.hash = 'timeline';
          return;
        }
        if (nextRoute === 'Settings') {
          window.location.hash = 'settings';
          return;
        }
        window.location.hash = '';
      }}
    >
      {renderRoute()}
    </MainLayout>
  );
}
