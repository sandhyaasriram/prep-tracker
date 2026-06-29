/**
 * Login page for Placement OS.
 * Supports Supabase email/password sign in and sign up.
 */

import { useState } from 'react';
import { ArrowRight, Brain, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Card, CardBody, Badge, Input } from '@/components';

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

/**
 * Authentication entry screen.
 */
export function LoginPage({ onSignIn, onSignUp }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password);
        return;
      }

      await onSignUp(email.trim(), password);
      setMessage('Account created. If email confirmation is enabled, check your inbox before signing in.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#0D0F12]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex items-center px-6 py-12 lg:px-12">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DC] bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[#7A736B] shadow-sm dark:border-[#232830] dark:bg-[#13161A]">
              <Sparkles size={12} />
              Personal placement operating system
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-[1.05] text-[#1A1614] dark:text-[#E8EDF2] md:text-6xl">
                Calm, focused placement prep. One daily command center.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#7A736B] md:text-lg">
                Placement OS keeps DSA, applications, interviews, projects, certifications, and reflection in one place so you know exactly what matters today.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardBody className="space-y-2">
                  <ShieldCheck className="text-[#2D7A4F]" size={20} />
                  <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Single-user by design</p>
                  <p className="text-sm text-[#7A736B]">Built for your daily workflow, but flexible later.</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="space-y-2">
                  <Brain className="text-[#5B5FEF]" size={20} />
                  <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">AI coach later</p>
                  <p className="text-sm text-[#7A736B]">Gemini proxy arrives in Phase 9.</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="space-y-2">
                  <Badge variant="dsa">Daily ROI</Badge>
                  <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Less guessing</p>
                  <p className="text-sm text-[#7A736B]">Open it each morning and move straight into action.</p>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 lg:px-12">
          <Card className="w-full max-w-md shadow-lg">
            <CardBody className="space-y-6 p-6">
              <div className="space-y-2 text-center">
                <h2 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Welcome back</h2>
                <p className="text-sm text-[#7A736B]">Sign in with email and password.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F3F0EB] p-1 dark:bg-[#1C2028]">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'signin'
                      ? 'bg-white text-[#1A1614] shadow-sm dark:bg-[#13161A] dark:text-[#E8EDF2]'
                      : 'text-[#7A736B]'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'signup'
                      ? 'bg-white text-[#1A1614] shadow-sm dark:bg-[#13161A] dark:text-[#E8EDF2]'
                      : 'text-[#7A736B]'
                  }`}
                >
                  Create account
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="sandhyaa@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  helperText="Use a password you can keep locally secure."
                />

                {error && <p className="rounded-lg border border-[#E8622A]/30 bg-[#E8622A]/10 px-3 py-2 text-sm text-[#E8622A]">{error}</p>}
                {message && <p className="rounded-lg border border-[#2D7A4F]/30 bg-[#2D7A4F]/10 px-3 py-2 text-sm text-[#2D7A4F]">{message}</p>}

                <Button type="submit" className="w-full" isLoading={submitting} icon={<ArrowRight size={16} />}>
                  {mode === 'signin' ? 'Login' : 'Create account'}
                </Button>
              </form>

              <div className="rounded-xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 text-sm text-[#7A736B] dark:border-[#232830] dark:bg-[#1C2028]">
                The dashboard seeds your placement data on first login. If a section is missing later, it will be filled from the seeded JSON set.
              </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
