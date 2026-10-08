import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { JobManifest } from '../types';
import { publicUrl } from '../publicUrl';
import { shortTrialName } from '../trials';
import { Modal } from './Modal';

interface VideoModalProps {
  manifest: JobManifest;
  activeTrialName: string | null;
  onClose: () => void;
}

export function VideoModal({ manifest, activeTrialName, onClose }: VideoModalProps) {
  const videos = useMemo(
    () => manifest.trials.flatMap((trial) => trial.videos.map((video) => ({
      ...video,
      taskName: trial.taskName,
      trialName: trial.trialName
    }))),
    [manifest]
  );
  const firstActiveTrialVideo = videos.findIndex((video) => video.trialName === activeTrialName);
  const [selectedIndex, setSelectedIndex] = useState(firstActiveTrialVideo >= 0 ? firstActiveTrialVideo : 0);
  const selectedVideo = videos[selectedIndex];

  if (!selectedVideo) return null;

  return (
    <Modal
      title="Job videos"
      subtitle={`${manifest.jobId} · ${videos.length} recording${videos.length === 1 ? '' : 's'}`}
      size="large"
      onClose={onClose}
    >
      <div className="video-player">
        <label className="video-picker">
          <span>Recording</span>
          <select value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>
            {manifest.trials.filter((trial) => trial.videos.length > 0).map((trial) => (
              <optgroup key={trial.trialName} label={`${trial.taskName} · ${shortTrialName(trial.trialName)}`}>
                {trial.videos.map((video) => {
                  const index = videos.findIndex((candidate) =>
                    candidate.trialName === trial.trialName && candidate.relativePath === video.relativePath
                  );
                  return <option key={video.relativePath} value={index}>{video.name}</option>;
                })}
              </optgroup>
            ))}
          </select>
        </label>

        <p className="video-meta">
          {selectedVideo.taskName} · {shortTrialName(selectedVideo.trialName)}
        </p>

        <video
          className="job-video"
          key={selectedVideo.url}
          controls
          preload="metadata"
          aria-label={`Recording ${selectedVideo.name}`}
          onEnded={() => setSelectedIndex((index) => Math.min(videos.length - 1, index + 1))}
        >
          <source src={publicUrl(selectedVideo.url)} type={selectedVideo.mediaType} />
          Your browser cannot play this recording.
        </video>

        <div className="video-navigation">
          <button className="text-button" type="button" onClick={() => setSelectedIndex((index) => index - 1)} disabled={selectedIndex === 0}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span>{selectedIndex + 1} of {videos.length}</span>
          <button className="text-button" type="button" onClick={() => setSelectedIndex((index) => index + 1)} disabled={selectedIndex === videos.length - 1}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
