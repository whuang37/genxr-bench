const $ = selector => document.querySelector(selector);

function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.split(/\r?\n/);
  let html = '';
  let inList = false;
  let currentParagraph = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const fullText = currentParagraph.join(' ').trim();
      if (fullText) {
        html += `<p class="md-p">${formatInline(fullText)}</p>`;
      }
      currentParagraph = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.slice(3).trim();
      html += `<h4 class="md-heading">${escapeHtml(text)}</h4>`;
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.slice(4).trim();
      html += `<h5 class="md-subheading">${escapeHtml(text)}</h5>`;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      if (!inList) { html += '<ul class="md-list">'; inList = true; }
      const itemText = formatInline(line.slice(2).trim());
      html += `<li>${itemText}</li>`;
      continue;
    }

    if (inList) {
      // Continuation of list item
      // Append to the last <li> before closing
      const lastLiIdx = html.lastIndexOf('</li>');
      if (lastLiIdx !== -1) {
        html = html.slice(0, lastLiIdx) + ' ' + formatInline(line) + '</li>';
        continue;
      }
      html += '</ul>';
      inList = false;
    }

    currentParagraph.push(line);
  }

  flushParagraph();
  if (inList) html += '</ul>';
  return html;
}
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatInline(str) {
  let s = escapeHtml(str);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

export function initPlayground(tasks) {
  let task = tasks[0], output = task.outputs[0];
  let activated = false;
  const select = $('#task-select'), stage = $('#app-stage');
  for (const item of tasks) select.add(new Option(item.title, item.id));

  function appUrl() {
    const url = new URL(output.url, document.baseURI);
    url.searchParams.set('formFactor', 'auto');
    return url.href;
  }

  function loadApp() {
    if (!activated) return;
    stage.replaceChildren();
    const frame = document.createElement('iframe');
    frame.src = appUrl();
    frame.title = `${task.title} — ${output.model}`;
    frame.loading = 'lazy';
    frame.scrolling = 'no';
    frame.setAttribute('scrolling', 'no');
    frame.style.overflow = 'hidden';
    frame.allow = 'camera; microphone; xr-spatial-tracking; fullscreen';
    frame.allowFullscreen = true;
    stage.append(frame);
  }

  function draw() {
    $('#task-markdown').innerHTML = renderMarkdown(task.instructions_markdown);
    $('#model-options').replaceChildren();
    for (const item of task.outputs) {
      const button = document.createElement('button');
      button.setAttribute('aria-pressed', item === output);
      button.setAttribute('aria-label', `${item.model}: ${item.status === 'pass' ? 'passed' : 'failed'} evaluation`);

      const dot = document.createElement('span');
      dot.className = `status-dot ${item.status}`;
      dot.setAttribute('aria-hidden', 'true');

      button.append(dot, document.createTextNode(item.model));
      button.addEventListener('click', () => {
        output = item;
        draw();
      });
      $('#model-options').append(button);
    }

    $('#open-app').href = appUrl();
    loadApp();

    const failureBox = $('#playground-failure');
    failureBox.hidden = output.status !== 'fail';
    if (!failureBox.hidden) {
      $('#failure-text').textContent = output.reason || 'Evaluation failure: Failed automated verification assertions.';
    }
  }

  select.addEventListener('change', () => {
    task = tasks.find(item => item.id === select.value) || tasks[0];
    output = task.outputs.find(item => item.model === output.model) || task.outputs[0];
    draw();
  });

  $('#reset-app').addEventListener('click', loadApp);
  draw();
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    activated = true;
    loadApp();
    observer.disconnect();
  }, { rootMargin: '200px' });
  observer.observe(stage);
}
