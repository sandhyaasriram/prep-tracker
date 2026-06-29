/**
 * Root App component for Placement OS.
 * Manages authentication state, seeding, and phase-based screen switching.
 */

import { LoginPage } from '@/pages/LoginPage';
import { MainLayout, type AppNavRoute } from '@/components/layout/MainLayout';
import { PageFallback } from '@/components/layout/PageFallback';
import { Button } from '@/components/ui';
import { WeeklyGoalsProvider } from '@/context/WeeklyGoalsContext';
import { useAuth } from '@/hooks/useAuth';
import { useSeedUserData } from '@/hooks/useSeedUserData';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { APP_ROUTE_PATHS, hashToPath, pathToAppRoute } from '@/utils/appRoutes';
import { readOAuthReturnError, clearOAuthReturnParams } from '@/lib/googleExport';
import { toast } from '@/utils/toast';

interface AuthenticatedAppProps {
  user: User;
  route: AppNavRoute;
  onSignOut: () => void;
  children: ReactNode;
}

const MissionControlPage = lazy(() =>
  import('@/pages/MissionControlPage').then((module) => ({ default: module.MissionControlPage }))
);
const DSAPage = lazy(() => import('@/pages/DSAPage').then((module) => ({ default: module.DSAPage })));
const ApplicationsPage = lazy(() =>
  import('@/pages/ApplicationsPage').then((module) => ({ default: module.ApplicationsPage }))
);
const InterviewPrepPage = lazy(() =>
  import('@/pages/InterviewPrepPage').then((module) => ({ default: module.InterviewPrepPage }))
);
const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage }))
);
const CertificationsPage = lazy(() =>
  import('@/pages/CertificationsPage').then((module) => ({ default: module.CertificationsPage }))
);
const JournalPage = lazy(() => import('@/pages/JournalPage').then((module) => ({ default: module.JournalPage })));
const WeeklyReviewPage = lazy(() =>
  import('@/pages/WeeklyReviewPage').then((module) => ({ default: module.WeeklyReviewPage }))
);
const TimelinePage = lazy(() =>
  import('@/pages/TimelinePage').then((module) => ({ default: module.TimelinePage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);

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

function AuthenticatedApp({ user, route, onSignOut, children }: AuthenticatedAppProps) {
  const navigate = useNavigate();

  return (
    <MainLayout
      user={user}
      onSignOut={onSignOut}
      activeRoute={route}
      onNavigate={(nextRoute) => {
        navigate(APP_ROUTE_PATHS[nextRoute]);
      }}
    >
      {children}
    </MainLayout>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { seeding, error: seedError, retry: retrySeed, dismissError: dismissSeedError } = useSeedUserData(user?.id ?? null);
  const [route, setRoute] = useState<AppNavRoute>('Dashboard');
  const [seedErrorDismissed, setSeedErrorDismissed] = useState(false);

  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      navigate(hashToPath(location.hash), { replace: true });
      return;
    }

    const routeFromPath = pathToAppRoute(location.pathname);
    if (routeFromPath) {
      setRoute(routeFromPath);
      return;
    }

    const hash = location.hash.replace('#', '') as HashRoute;
    if (hash) {
      navigate(hashToPath(hash), { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const storedError = sessionStorage.getItem('placementos_oauth_toast_error');
    if (storedError) {
      toast.error(storedError);
      sessionStorage.removeItem('placementos_oauth_toast_error');
      navigate('/settings', { replace: true });
      return;
    }

    const oauthError = readOAuthReturnError();
    if (oauthError) {
      toast.error(oauthError);
      clearOAuthReturnParams();
      navigate('/settings', { replace: true });
    }
  }, [navigate, user]);

  if (loading || seeding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] dark:bg-[#101216]">
        <div className="space-y-3 text-center">
          <h1 className="font-display text-4xl text-[#1A1614] dark:text-[#E8EDF2]">Placement OS</h1>
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{loading ? 'Checking authentication...' : 'Seeding your workspace...'}</p>
        </div>
      </div>
    );
  }

  if (seedError && !seedErrorDismissed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-6 dark:bg-[#101216]">
        <div className="max-w-lg rounded-2xl border border-[#E8622A]/30 bg-white p-6 text-left shadow-sm dark:border-[#E8622A]/30 dark:bg-[#161A20]">
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
    const page = (() => {
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
    })();

    return <Suspense fallback={<PageFallback />}>{page}</Suspense>;
  };

  return (
    <WeeklyGoalsProvider userId={user.id}>
      <AuthenticatedApp user={user} route={route} onSignOut={signOut}>
        {renderRoute()}
      </AuthenticatedApp>
    </WeeklyGoalsProvider>
  );
}
