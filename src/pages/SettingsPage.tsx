/**
 * Settings page — profile, theme, data backup, Gemini, and danger zone.
 */

import { useEffect, useState, type ChangeEvent } from 'react';
import { Download, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Input } from '@/components';
import { callGeminiBrief } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { useUserSettings } from '@/hooks/useUserSettings';
import profileSeed from '@/seed/profile.json';
import { downloadUserBackup, importUserBackup, resetUserData, type PlacementOSBackup } from '@/utils/dataBackup';
import { getTheme } from '@/utils/storage';
import type { User } from '@supabase/supabase-js';

interface SettingsPageProps {
  user: User;
}

/**
 * Workspace settings — profile, theme, backup, Gemini, and reset.
 */
export function SettingsPage({ user }: SettingsPageProps) {
  const {
    settings,
    loading,
    hasGeminiKey,
    updateGeminiApiKey,
    updateProfile,
    updateThemePreference,
  } = useUserSettings(user.id);

  const [college, setCollege] = useState('');
  const [graduationYear, setGraduationYear] = useState(2026);
  const [targetCompaniesText, setTargetCompaniesText] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [geminiKey, setGeminiKey] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [geminiMessage, setGeminiMessage] = useState<string | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setCollege(settings.college);
    setGraduationYear(settings.graduation_year);
    setTargetCompaniesText(settings.target_companies.join(', '));
    setTheme(getTheme());
  }, [settings]);

  const handleSaveProfile = async (): Promise<void> => {
    setProfileMessage(null);

    try {
      const companies = targetCompaniesText
        .split(',')
        .map((company) => company.trim())
        .filter(Boolean);

      await updateProfile({
        college: college.trim(),
        graduationYear,
        targetCompanies: companies,
      });
      setProfileMessage('Profile saved');
    } catch (saveError) {
      setProfileMessage(saveError instanceof Error ? saveError.message : 'Failed to save profile.');
    }
  };

  const handleSaveGeminiKey = async (): Promise<void> => {
    setGeminiMessage(null);

    try {
      await updateGeminiApiKey(geminiKey);
      setGeminiKey('');
      setGeminiMessage('API key saved');
    } catch (saveError) {
      setGeminiMessage(saveError instanceof Error ? saveError.message : 'Failed to save API key.');
    }
  };

  const handleTestGemini = async (): Promise<void> => {
    setTestingGemini(true);
    setGeminiMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not signed in');
      }

      if (!hasGeminiKey) {
        throw new Error('Save a Gemini API key first.');
      }

      await callGeminiBrief(token, true);
      setGeminiMessage('Connection successful — Gemini proxy responded.');
    } catch (testError) {
      setGeminiMessage(testError instanceof Error ? testError.message : 'Gemini test failed.');
    } finally {
      setTestingGemini(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setBusyAction('export');
    setDataMessage(null);

    try {
      await downloadUserBackup(user.id);
      setDataMessage('Backup downloaded.');
    } catch (exportError) {
      setDataMessage(exportError instanceof Error ? exportError.message : 'Export failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!window.confirm('Import will replace all current workspace data. Continue?')) {
      return;
    }

    setBusyAction('import');
    setDataMessage(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text) as PlacementOSBackup;
      await importUserBackup(user.id, backup);
      setDataMessage('Import complete. Refresh the page to see updated data.');
    } catch (importError) {
      setDataMessage(importError instanceof Error ? importError.message : 'Import failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReset = async (): Promise<void> => {
    if (!window.confirm('Reset ALL data to seeded defaults? This cannot be undone.')) {
      return;
    }

    setBusyAction('reset');
    setDataMessage(null);

    try {
      await resetUserData(user.id);
      setDataMessage('Workspace reset to defaults. Refresh the page.');
    } catch (resetError) {
      setDataMessage(resetError instanceof Error ? resetError.message : 'Reset failed.');
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading settings...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Settings</h1>
        <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">Profile, theme, backups, and workspace controls.</p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Profile</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={profileSeed.name} disabled helperText="Display name from profile seed" />
          <Input label="Email" value={user.email ?? ''} disabled helperText="Connected Supabase account" />
          <Input label="College" value={college} onChange={(event) => setCollege(event.target.value)} />
          <Input
            label="Graduation year"
            type="number"
            value={graduationYear}
            onChange={(event) => setGraduationYear(Number(event.target.value) || settings?.graduation_year || 2026)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Target companies</label>
            <textarea
              value={targetCompaniesText}
              onChange={(event) => setTargetCompaniesText(event.target.value)}
              rows={4}
              className="input-base resize-y text-sm"
              placeholder="Comma-separated list"
            />
          </div>
          <Button size="sm" onClick={() => void handleSaveProfile()}>
            Save profile
          </Button>
          {profileMessage && <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{profileMessage}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Theme</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <Button
                key={option}
                variant={theme === option ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setTheme(option);
                  void updateThemePreference(option);
                }}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Gemini API</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
            {hasGeminiKey ? 'API key on file in Supabase.' : 'No API key saved yet.'} Used only by the edge function.
          </p>
          <Input
            type="password"
            label="Gemini API key"
            value={geminiKey}
            onChange={(event) => setGeminiKey(event.target.value)}
            placeholder={hasGeminiKey ? 'Paste new key to replace' : 'Paste from Google AI Studio'}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!geminiKey.trim()} onClick={() => void handleSaveGeminiKey()}>
              Save key
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles size={14} />}
              disabled={testingGemini || !hasGeminiKey}
              onClick={() => void handleTestGemini()}
            >
              Test connection
            </Button>
          </div>
          {geminiMessage && <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{geminiMessage}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Data</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              disabled={busyAction !== null}
              onClick={() => void handleExport()}
            >
              Export JSON
            </Button>
            <label className="inline-flex">
              <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => void handleImport(event)} />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E8E3DC] bg-white px-3 py-2 text-sm text-[#1A1614] transition-colors hover:bg-[#F3F0EB] dark:border-[#232830] dark:bg-[#1C2028] dark:text-[#E8EDF2] dark:hover:bg-[#232830]">
                <Upload size={14} />
                Import JSON
              </span>
            </label>
          </div>
          {dataMessage && <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{dataMessage}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold text-[#E8622A]">Danger zone</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
            Reset deletes all your data and re-seeds defaults. Export a backup first if you need one.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={busyAction === 'reset' ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
            disabled={busyAction !== null}
            onClick={() => void handleReset()}
          >
            Reset all data
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
