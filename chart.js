import { format } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const resources = { cost: 'Avg cost per task', tokens: 'Avg tokens per task (millions)', turns: 'Avg agent turns per task' };

function element(name, attributes = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function niceStep(value) {
  const base = 10 ** Math.floor(Math.log10(value || 1));
  const fraction = value / base;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * base;
}

export function renderChart(container, allRows, score, resource, detail, initialSelectedId = null, onSelect = null) {
  const rows = allRows.filter(row => row[score] !== null && row[resource] !== null);
  container.replaceChildren();
  detail.textContent = '';
  if (!rows.length) { container.textContent = 'No data for this comparison yet.'; return { setSelection: () => {} }; }
  const width = 1120, height = 510;
  const plot = { left: 67, right: 1070, top: 35, bottom: 445 };
  const step = niceStep(Math.max(...rows.map(row => row[resource]), 1) / 4);
  const maxX = Math.ceil(Math.max(...rows.map(row => row[resource]), 1) / step) * step;
  const minY = score === 'design' ? 1 : 0;
  const maxY = score === 'design' ? 5 : Math.min(100, Math.max(60, Math.ceil(Math.max(...rows.map(row => row.pass)) / 10) * 10));
  const x = value => plot.right - value / maxX * (plot.right - plot.left);
  const y = value => plot.bottom - (value - minY) / (maxY - minY) * (plot.bottom - plot.top);
  const svg = element('svg', { viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': `${score === 'pass' ? 'Overall Pass@1' : 'Design Score'} versus ${resources[resource]}. Lower resource use is to the right.` });
  container.append(svg);
  for (let value = 0; value <= maxX + step / 10; value += step) {
    svg.append(element('line', { x1: x(value), x2: x(value), y1: plot.top, y2: plot.bottom, class: 'grid' }));
    const label = resource === 'cost' ? `$${value}` : `${Number(value.toFixed(2))}${resource === 'tokens' ? 'M' : ''}`;
    svg.append(element('text', { x: x(value), y: plot.bottom + 27, 'text-anchor': 'middle', class: 'x-tick' }, label));
  }
  const yStep = score === 'design' ? 1 : 10;
  for (let value = minY; value <= maxY; value += yStep) {
    svg.append(element('line', { x1: plot.left, x2: plot.right, y1: y(value), y2: y(value), class: 'grid' }));
    svg.append(element('text', { x: plot.left - 14, y: y(value) + 4, 'text-anchor': 'end' }, score === 'pass' ? `${value}%` : value.toFixed(1)));
  }
  svg.append(element('text', { x: (plot.left + plot.right) / 2, y: 498, 'text-anchor': 'middle', class: 'axis-title' }, resources[resource]));

  const occupied = [];
  const groups = new Map();
  const pointNodes = new Map();
  const guide = element('g', { 'aria-hidden': 'true', 'pointer-events': 'none' });
  let pinned = initialSelectedId ? rows.find(row => row.id === initialSelectedId) || null : null;

  function inspect(row) {
    guide.replaceChildren();
    svg.querySelectorAll('.x-tick').forEach(tick => {
      tick.style.visibility = row && Math.abs(Number(tick.getAttribute('x')) - x(row[resource])) < 60 ? 'hidden' : 'visible';
    });
    for (const [model, group] of groups) group.classList.toggle('faded', Boolean(row && model !== row.model));
    for (const [id, node] of pointNodes) node.querySelector('.point-dot').setAttribute('r', row?.id === id ? '7' : '5');
    if (!row) { detail.textContent = ''; return; }
    guide.style.color = row.color;
    const px = x(row[resource]), py = y(row[score]);
    guide.append(element('line', { x1: plot.left, x2: px, y1: py, y2: py, class: 'guide' }));
    guide.append(element('line', { x1: px, x2: px, y1: py, y2: plot.bottom, class: 'guide' }));
    // White backing keeps active values legible when they coincide with ticks.
    guide.append(element('rect', { x: 0, y: py - 12, width: 62, height: 25, fill: '#fff' }));
    guide.append(element('text', { x: plot.left - 14, y: py + 5, 'text-anchor': 'end', class: 'guide-label' }, format(row[score], score)));
    guide.append(element('rect', { x: px - 46, y: plot.bottom + 10, width: 92, height: 26, fill: '#fff' }));
    guide.append(element('text', { x: px, y: plot.bottom + 28, 'text-anchor': 'middle', class: 'guide-label' }, format(row[resource], resource)));
    detail.textContent = `${row.model} · ${row.effort} · ${score === 'pass' ? 'Pass@1' : 'Design'} ${format(row[score], score)} · ${format(row.cost, 'cost')} · ${format(row.tokens, 'tokens')} tokens · ${format(row.turns, 'turns')} turns`;
  }

  function setPinned(next) {
    pinned = next;
    inspect(pinned);
    onSelect?.(pinned ? pinned.id : null);
  }

  for (const row of rows) {
    if (!groups.has(row.model)) {
      const group = element('g', { class: 'series', 'data-model': row.model, style: `color:${row.color}` });
      groups.set(row.model, group);
      svg.append(group);
      const configurations = rows.filter(other => other.model === row.model).sort((a, b) => b[resource] - a[resource]);
      if (configurations.length > 1) group.append(element('polyline', {
        points: configurations.map(point => `${x(point[resource])},${y(point[score])}`).join(' '),
        fill: 'none', stroke: 'currentColor', 'stroke-width': 2, opacity: .65,
      }));
    }
    const group = groups.get(row.model);
    const px = x(row[resource]), py = y(row[score]);
    const point = element('g', { class: 'data-point', tabindex: '0', role: 'button', 'aria-label': `${row.model}, ${row.effort}, ${format(row[score], score)}, ${resources[resource]} ${format(row[resource], resource)}` });
    point.append(element('circle', { cx: px, cy: py, r: 14, class: 'point-hit' }));
    point.append(element('circle', { cx: px, cy: py, r: 5, class: 'point-dot' }));
    group.append(point);
    pointNodes.set(row.id, point);
    // Place labels near points without overlapping previously placed labels.
    const labelWidth = row.model.length * 6.6 + 8;
    let placement;
    for (const offset of [-28, 26, -57, 55, -85, 84, -112, 112]) {
      const lx = Math.max(plot.left + 3, Math.min(px + 10, plot.right - labelWidth));
      const ly = Math.max(plot.top + 5, Math.min(py + offset, plot.bottom - 18));
      const box = { left: lx, right: lx + labelWidth, top: ly - 11, bottom: ly + 16 };
      placement = { lx, ly, box };
      if (!occupied.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) break;
    }
    occupied.push(placement.box);
    if (Math.abs(placement.ly - py) > 38) group.append(element('line', { x1: px, y1: py, x2: placement.lx, y2: placement.ly, stroke: 'currentColor', opacity: .2, 'pointer-events': 'none' }));
    // Keep both labels in the point's hit area so they share its interactions.
    point.append(element('rect', { x: placement.box.left, y: placement.box.top, width: labelWidth, height: placement.box.bottom - placement.box.top, class: 'point-hit' }));
    point.append(element('text', { x: placement.lx, y: placement.ly, class: 'model-label', 'pointer-events': 'none' }, row.model));
    point.append(element('text', { x: placement.lx, y: placement.ly + 14, class: 'effort-label', 'pointer-events': 'none' }, row.effort.toUpperCase()));
    point.addEventListener('pointerenter', () => inspect(row));
    point.addEventListener('pointerleave', () => inspect(pinned));
    point.addEventListener('focus', () => inspect(row));
    point.addEventListener('blur', () => inspect(pinned));
    point.addEventListener('click', event => {
      event.stopPropagation();
      setPinned(pinned?.id === row.id ? null : row);
    });
    point.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setPinned(pinned?.id === row.id ? null : row);
      }
      if (event.key === 'Escape') {
        setPinned(null);
      }
    });
  }
  svg.append(guide);
  if (pinned) inspect(pinned);
  svg.addEventListener('click', () => setPinned(null));

  return {
    setSelection(id) {
      pinned = id ? rows.find(r => r.id === id) || null : null;
      inspect(pinned);
    },
  };
}
