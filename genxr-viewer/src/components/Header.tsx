import { Video } from 'lucide-react';
import type { JobManifest, JobRegistryEntry } from '../types';

interface HeaderProps {
  jobs: JobRegistryEntry[];
  activeJobId: string;
  onSelectJob: (jobId: string) => void;
  manifest: JobManifest | null;
  onOpenVideos: () => void;
}

export function Header({
  jobs,
  activeJobId,
  onSelectJob,
  manifest,
  onOpenVideos
}: HeaderProps) {
  const total = manifest?.totalTrials ?? 0;
  const passed = manifest?.passedTrials ?? 0;
  const totalVideos = manifest?.totalVideos ?? 0;

  return (
    <header className="topbar">
      <div className="wordmark">
        GenXR <span>Viewer</span>
      </div>

      <label className="job-picker">
        <span>Job</span>
        <select value={activeJobId} onChange={(event) => onSelectJob(event.target.value)}>
          {jobs.map((job) => (
            <option key={job.jobId} value={job.jobId}>
              {job.jobId}
            </option>
          ))}
        </select>
      </label>

      <div className="job-overview">
        <p className="job-summary" aria-label="Job summary">
          <span>{total} trials</span>
          <span>{passed} passed</span>
        </p>
        <button
          className="text-button video-button"
          type="button"
          onClick={onOpenVideos}
          disabled={totalVideos === 0}
          title={totalVideos === 0 ? 'Re-import this job with --import-artifacts to view recordings.' : 'View all job recordings'}
          aria-label={totalVideos === 0 ? 'Videos (0). Re-import this job with --import-artifacts to view recordings.' : `View all ${totalVideos} job recordings`}
        >
          <Video size={15} />
          Videos ({totalVideos})
        </button>
      </div>
    </header>
  );
}
