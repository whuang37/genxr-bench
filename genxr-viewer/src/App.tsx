import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Terminal } from 'lucide-react';
import type { JobManifest, JobRegistryEntry } from './types';
import { findTrialIndex } from './trials';
import { Header } from './components/Header';
import { TrialDetail } from './components/TrialDetail';
import { TrialList } from './components/TrialList';
import { VideoModal } from './components/VideoModal';
import { publicUrl } from './publicUrl';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The job could not be loaded.';
}

export function App() {
  const [jobs, setJobs] = useState<JobRegistryEntry[]>([]);
  const [activeJobId, setActiveJobId] = useState('');
  const [manifest, setManifest] = useState<JobManifest | null>(null);
  const [activeTrialName, setActiveTrialName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videosOpen, setVideosOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      try {
        const response = await fetch(publicUrl('jobs/jobs.json'), {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('No imported jobs were found.');

        const nextJobs: JobRegistryEntry[] = await response.json();
        setJobs(nextJobs);
        setActiveJobId(nextJobs[0]?.jobId ?? '');
      } catch {
        if (!controller.signal.aborted) setJobs([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadJobs();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeJobId) {
      setManifest(null);
      return;
    }

    const controller = new AbortController();

    async function loadManifest() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(publicUrl(`jobs/${activeJobId}/manifest.json`), {
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Could not load job ${activeJobId}.`);

        const nextManifest: JobManifest = await response.json();
        setManifest(nextManifest);
        setActiveTrialName(nextManifest.trials[0]?.trialName ?? null);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(errorMessage(loadError));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadManifest();
    return () => controller.abort();
  }, [activeJobId]);

  const activeIndex = useMemo(
    () => findTrialIndex(manifest?.trials ?? [], activeTrialName),
    [manifest, activeTrialName]
  );
  const activeTrial = activeIndex >= 0 ? manifest?.trials[activeIndex] ?? null : null;
  const hasPrevious = activeIndex > 0;
  const hasNext = Boolean(manifest && activeIndex < manifest.trials.length - 1);

  const selectAdjacentTrial = useCallback(
    (offset: -1 | 1) => {
      if (!manifest) return;
      const nextTrial = manifest.trials[activeIndex + offset];
      if (nextTrial) setActiveTrialName(nextTrial.trialName);
    },
    [activeIndex, manifest]
  );

  useEffect(() => {
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if (videosOpen) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable)
      ) return;

      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        selectAdjacentTrial(1);
      }
      if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        selectAdjacentTrial(-1);
      }
      if (event.key === '[' || event.key === '\\') {
        setSidebarOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', navigateWithKeyboard);
    return () => window.removeEventListener('keydown', navigateWithKeyboard);
  }, [selectAdjacentTrial, videosOpen]);

  return (
    <div className="app-root">
      <Header
        jobs={jobs}
        activeJobId={activeJobId}
        onSelectJob={setActiveJobId}
        manifest={manifest}
        onOpenVideos={() => setVideosOpen(true)}
      />

      {loading && <div className="empty-state">Loading benchmark data…</div>}

      {!loading && error && (
        <div className="empty-state error-state">
          <AlertCircle size={22} />
          <h2>Job unavailable</h2>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="empty-state">
          <h2>No jobs imported</h2>
          <p>Import a benchmark job, then reload the viewer.</p>
          <code className="command-hint">
            <Terminal size={15} /> npm run import-job -- ../jobs/&lt;job-id&gt;
          </code>
        </div>
      )}

      {!loading && !error && manifest && (
        <div className="workspace">
          <TrialList
            trials={manifest.trials}
            activeTrialName={activeTrialName}
            onSelectTrial={setActiveTrialName}
            isOpen={sidebarOpen}
          />

          {activeTrial ? (
            <TrialDetail
              key={activeTrial.trialName}
              trial={activeTrial}
              onNext={() => selectAdjacentTrial(1)}
              onPrevious={() => selectAdjacentTrial(-1)}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((open) => !open)}
            />
          ) : (
            <div className="empty-state">Select a trial.</div>
          )}
        </div>
      )}

      {videosOpen && manifest && manifest.totalVideos > 0 && (
        <VideoModal
          manifest={manifest}
          activeTrialName={activeTrialName}
          onClose={() => setVideosOpen(false)}
        />
      )}
    </div>
  );
}
