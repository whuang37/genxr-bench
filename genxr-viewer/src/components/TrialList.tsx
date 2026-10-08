import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { TrialData } from '../types';
import { isVerifierPassed, shortTrialName } from '../trials';

type TrialFilter = 'all' | 'passed' | 'failed';

interface TrialListProps {
  trials: TrialData[];
  activeTrialName: string | null;
  onSelectTrial: (trialName: string) => void;
  isOpen: boolean;
}

export function TrialList({
  trials,
  activeTrialName,
  onSelectTrial,
  isOpen
}: TrialListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TrialFilter>('all');

  const visibleTrials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return trials.filter((trial) => {
      const matchesQuery =
        !normalizedQuery ||
        trial.taskName.toLowerCase().includes(normalizedQuery) ||
        trial.trialName.toLowerCase().includes(normalizedQuery);
      if (!matchesQuery) return false;

      const passed = isVerifierPassed(trial.verifier);
      if (filter === 'passed') return passed;
      if (filter === 'failed') return !passed;
      return true;
    });
  }, [filter, query, trials]);

  if (!isOpen) return null;

  return (
    <aside className="trial-sidebar">
      <div className="sidebar-heading">
        <div>
          <h2>Trials</h2>
          <span>{visibleTrials.length} shown</span>
        </div>
      </div>

      <div className="trial-controls">
        <label className="search-field">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a trial"
            aria-label="Find a trial"
          />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as TrialFilter)} aria-label="Filter trials">
          <option value="all">All</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <nav className="trial-list" aria-label="Trials">
        {visibleTrials.length === 0 && <p className="list-empty">No matching trials.</p>}
        {visibleTrials.map((trial) => {
          const passed = isVerifierPassed(trial.verifier);

          return (
            <button
              key={trial.trialName}
              type="button"
              className={trial.trialName === activeTrialName ? 'trial-row selected' : 'trial-row'}
              onClick={() => onSelectTrial(trial.trialName)}
              aria-current={trial.trialName === activeTrialName ? 'true' : undefined}
            >
              <span className="trial-row-main">
                <strong>{trial.taskName}</strong>
                <small>{shortTrialName(trial.trialName)}</small>
              </span>
              <span className="trial-row-meta">
                <span className={passed ? 'status pass' : 'status fail'}>{passed ? 'Pass' : 'Fail'}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
