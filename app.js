import { staticResults, staticTasks } from './static-data.js';
import { readFile } from './data.js';
import { initResults } from './results.js';
import { initPlayground } from './playground.js';
import { initHeroMotion, initHeroScroll, initCarousel } from './media.js';

const $ = selector => document.querySelector(selector);

function showError(selector, error) {
  const target = $(selector);
  target.hidden = false;
  target.textContent = error.message;
  console.error(error);
}

$('#copy-citation').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#bibtex').textContent);
    $('#copy-status').textContent = 'Citation copied.';
    $('#copy-citation').textContent = 'Copied ✓';
  } catch {
    const selection = window.getSelection(), range = document.createRange();
    range.selectNodeContents($('#bibtex')); selection.removeAllRanges(); selection.addRange(range);
    $('#copy-status').textContent = 'Citation selected. Use your browser’s Copy command.';
    $('#copy-citation').textContent = 'Selected — copy manually';
  }
});

initHeroScroll();
initHeroMotion();
initCarousel();

// Instant synchronous startup rendering:
// Benchmark charts, tables, and demo instructions markdown load immediately
// without waiting on async fetch() round trips.
if (staticResults?.length) {
  initResults(staticResults).catch(error => showError('#results-error', error));
} else {
  initResults().catch(error => showError('#results-error', error));
}

if (staticTasks?.length) {
  initPlayground(staticTasks);
} else {
  readFile('data/demos.json', 'json')
    .then(data => initPlayground(data.tasks))
    .catch(error => showError('#playground-error', error));
}
