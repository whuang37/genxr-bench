// Small CSV reader: quoted fields, escaped quotes, CRLF, and quoted newlines.
export function parseCSV(text) {
  const records = [];
  let record = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i <= text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === '\n' || character === undefined)) {
      record.push(field.replace(/\r$/, ''));
      field = '';
      if (character !== ',') {
        if (record.some(value => value !== '')) records.push(record);
        record = [];
      }
    } else if (character !== undefined) field += character;
  }
  if (quoted) throw new Error('Unclosed quote in CSV.');
  const headers = records.shift();
  if (!headers?.length) throw new Error('The CSV is empty.');
  return records.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export async function readFile(path, type = 'text') {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
  return type === 'json' ? response.json() : response.text();
}

export const heuristics = [
  ['align', 'Alignment'], ['visual', 'Visual quality'], ['anchor', 'Anchoring'],
  ['scale', 'Scale'], ['input', 'Input'], ['physics', 'Physics'],
  ['feedback', 'Feedback'], ['error', 'Error prevention'], ['context', 'Context'], ['clutter', 'Clutter'],
];

export const colors = { anthropic: '#d48158', openai: '#37866e', google: '#778eb7', deepseek: '#927aa7' };

export async function loadResults() {
  const [benchmark, design] = await Promise.all([
    readFile('data/benchmark.csv').then(parseCSV), readFile('data/design.csv').then(parseCSV),
  ]);
  const designById = new Map(design.map(row => [row.id, row]));
  const seen = new Set();
  return benchmark.map(row => {
    if (!row.id || seen.has(row.id)) throw new Error('Benchmark IDs must be present and unique.');
    seen.add(row.id);
    const scores = designById.get(row.id);
    const result = { ...row, ...scores, color: colors[row.family] || '#6e7c73' };
    for (const key of ['pass', 'repair', 'feature', 'app', 'cost', 'tokens', 'turns', 'design', ...heuristics.map(([key]) => key)]) {
      const value = result[key];
      result[key] = value === '' || value === undefined ? null : Number(value);
      if (result[key] !== null && !Number.isFinite(result[key])) throw new Error(`Invalid ${key} for ${row.id}.`);
    }
    return result;
  });
}

export function format(value, key) {
  if (value === null || value === undefined) return '—';
  if (key === 'cost') return `$${value.toFixed(2)}`;
  if (key === 'tokens') return `${value.toFixed(2)}M`;
  if (['pass', 'repair', 'feature', 'app'].includes(key)) return `${value.toFixed(1)}%`;
  return value.toFixed(key === 'turns' ? 1 : 2);
}
