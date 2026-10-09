import { loadResults, heuristics, format } from './data.js';
import { renderChart } from './chart.js';

const $ = selector => document.querySelector(selector);

export async function initResults(initialRows = null) {
  const rows = initialRows || await loadResults();
  let score = 'pass', resource = 'cost', sortKey = 'pass', sortDirection = -1;
  let selectedRowId = null;
  let chartController = null;

  function updateTableSelection() {
    $('#results-table tbody').querySelectorAll('tr').forEach(tr => {
      const isSelected = tr.dataset.id === selectedRowId;
      tr.classList.toggle('selected', isSelected);
      tr.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  }

  function handleSelect(id) {
    selectedRowId = id;
    updateTableSelection();
    chartController?.setSelection(selectedRowId);
  }

  function drawTable() {
    const isPass = score === 'pass';
    const columns = isPass
      ? [
          ['model', 'Model'],
          ['pass', 'Overall'],
          ['feature', 'Feature'],
          ['repair', 'Repair'],
          ['app', 'App'],
          ['cost', 'Cost'],
          ['tokens', 'Tokens'],
          ['turns', 'Turns'],
        ]
      : [
          ['model', 'Model'],
          ['design', 'Average'],
          ...heuristics,
        ];

    const titleEl = $('#table-view-title');
    if (titleEl) titleEl.textContent = isPass ? 'Benchmark Results' : 'Design Evaluations';
    $('#download-results').href = `data/${isPass ? 'benchmark' : 'design'}.csv`;
    $('#results-table caption').textContent = `${isPass ? 'Benchmark results' : 'Design scores'}. Select a column heading to sort, or select a row to highlight in the graph.`;
    $('#table-note').textContent = isPass
      ? 'Pass@1 is the percentage of tasks with all required assertions passing. Tokens are reported in millions.'
      : 'Design scores use a 1–5 scale. Average is the mean across all 10 XR usability heuristics.';

    const head = $('#results-table thead'), body = $('#results-table tbody');
    head.replaceChildren(); body.replaceChildren();
    const header = document.createElement('tr');
    for (const [key, label] of columns) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.setAttribute('aria-sort', key === sortKey ? sortDirection === 1 ? 'ascending' : 'descending' : 'none');
      const button = document.createElement('button');
      const heading = document.createElement('span');
      heading.className = 'column-label';
      heading.textContent = label;
      button.append(heading);
      const scale = ['pass', 'feature', 'repair', 'app'].includes(key)
        ? 'PASS@1'
        : key === 'design' || (!isPass && key !== 'model') ? '(1–5)' : null;
      if (scale) {
        const subtitle = document.createElement('small');
        subtitle.className = 'column-scale';
        subtitle.textContent = scale;
        button.append(subtitle);
      }
      button.addEventListener('click', () => {
        sortDirection = key === sortKey ? -sortDirection : key === 'model' ? 1 : -1;
        sortKey = key;
        drawTable();
        $('#results-table thead').querySelectorAll('button')[columns.findIndex(([column]) => column === key)].focus();
      });
      cell.append(button); header.append(cell);
    }
    head.append(header);

    const sorted = [...rows].sort((a, b) => {
      if (a[sortKey] === null && b[sortKey] === null) return 0;
      if (a[sortKey] === null) return 1;
      if (b[sortKey] === null) return -1;
      return sortDirection * (sortKey === 'model' ? a.model.localeCompare(b.model) : a[sortKey] - b[sortKey]);
    });
    const best = Object.fromEntries(columns.slice(1).map(([key]) => {
      const values = rows.map(row => row[key]).filter(value => value !== null);
      if (['tokens', 'turns'].includes(key)) return [key, null];
      return [key, key === 'cost' ? Math.min(...values) : Math.max(...values)];
    }));

    for (const row of sorted) {
      const tr = document.createElement('tr');
      tr.dataset.id = row.id;
      tr.tabIndex = 0;
      tr.setAttribute('role', 'row');
      tr.setAttribute('aria-selected', selectedRowId === row.id ? 'true' : 'false');
      if (selectedRowId === row.id) tr.classList.add('selected');

      const toggleRow = () => {
        handleSelect(selectedRowId === row.id ? null : row.id);
      };
      tr.addEventListener('click', toggleRow);
      tr.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleRow();
        }
      });

      for (const [key] of columns) {
        const cell = document.createElement('td');
        if (key === 'model') {
          const dot = document.createElement('span');
          dot.className = 'model-dot';
          dot.style.background = row.color;

          const effort = document.createElement('span');
          effort.className = 'model-effort';
          effort.textContent = `[${row.effort}]`;

          cell.append(dot, document.createTextNode(row.model + ' '), effort);
        } else {
          cell.textContent = format(row[key], key);
          if (row[key] === best[key]) cell.className = 'best';
        }
        tr.append(cell);
      }
      body.append(tr);
    }
  }

  function drawGraph() {
    chartController = renderChart($('#chart'), rows, score, resource, $('#chart-detail'), selectedRowId, id => {
      selectedRowId = id;
      updateTableSelection();
    });
  }

  document.querySelectorAll('[data-score]').forEach(button => button.addEventListener('click', () => {
    score = button.dataset.score;
    sortKey = score;
    sortDirection = -1;
    document.querySelectorAll('[data-score]').forEach(tab => tab.setAttribute('aria-pressed', tab === button));
    drawGraph();
    drawTable();
  }));

  document.querySelectorAll('[data-resource]').forEach(button => button.addEventListener('click', () => {
    resource = button.dataset.resource;
    document.querySelectorAll('[data-resource]').forEach(tab => tab.setAttribute('aria-pressed', tab === button));
    drawGraph();
  }));

  drawGraph();
  drawTable();
}
