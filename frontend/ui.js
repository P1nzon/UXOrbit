function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

function createAgentIcon(agentType) {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '32');
  icon.setAttribute('height', '32');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('agent-icon');
  // Use inline SVG for demo; replace with sprite reference for production
  if (agentType === 'form') {
    icon.innerHTML = '<rect x="8" y="8" width="16" height="16" rx="3" fill="#2ec4b6"/><text x="16" y="22" text-anchor="middle" font-size="12" fill="#fff">F</text>';
  } else if (agentType === 'navigation') {
    icon.innerHTML = '<circle cx="16" cy="16" r="14" fill="#3a86ff"/><text x="16" y="22" text-anchor="middle" font-size="12" fill="#fff">N</text>';
  } else if (agentType === 'feedback') {
    icon.innerHTML = '<rect x="4" y="10" width="24" height="12" rx="6" fill="#ffbe0b"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#fff">A</text>';
  } else {
    icon.innerHTML = '<circle cx="16" cy="16" r="14" fill="#adb5bd"/>';
  }
  return icon;
}

function animateCardEntry(card) {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  setTimeout(() => {
    card.style.transition = 'opacity 0.5s, transform 0.5s';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 50);
}

function formatResultData(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(formatResultData).join(', ');
  if (typeof data === 'object') return JSON.stringify(data, null, 2);
  return String(data);
}

function createResultCard(agentResult) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${agentResult.agentType || 'Agent'} result`);
  card.appendChild(createAgentIcon(agentResult.agentType));
  const title = document.createElement('h4');
  title.textContent = `${agentResult.agentType ? agentResult.agentType.charAt(0).toUpperCase() + agentResult.agentType.slice(1) : 'Agent'} Agent`;
  card.appendChild(title);
  if (agentResult.error) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.textContent = `Error: ${agentResult.error}`;
    card.appendChild(errorMsg);
  } else if (agentResult.results && agentResult.results.usabilityReport) {
    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.textContent = agentResult.results.usabilityReport.summary;
    card.appendChild(summary);
    if (Array.isArray(agentResult.results.usabilityReport.issues)) {
      const issuesList = document.createElement('ul');
      agentResult.results.usabilityReport.issues.forEach(issue => {
        const li = document.createElement('li');
        li.textContent = `${issue.type}: ${issue.message}`;
        issuesList.appendChild(li);
      });
      card.appendChild(issuesList);
    }
    if (Array.isArray(agentResult.results.usabilityReport.recommendations)) {
      const recList = document.createElement('ul');
      recList.className = 'recommendations';
      agentResult.results.usabilityReport.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recList.appendChild(li);
      });
      card.appendChild(recList);
    }
  } else {
    const details = document.createElement('pre');
    details.textContent = formatResultData(agentResult);
    card.appendChild(details);
  }
  animateCardEntry(card);
  return card;
}

function createProgressIndicator(status) {
  const statusMap = {
    started: 'Pending',
    running: 'Running',
    completed: 'Completed',
    completed_with_errors: 'Completed (with errors)',
    failed: 'Failed',
    pending: 'Pending'
  };
  const statusEl = document.querySelector('#status');
  if (!statusEl || !status) return;
  statusEl.innerHTML = `<span class="status-badge ${mapStatusToClass(status)}">${statusMap[status] || status}</span>`;
  if (status === 'running' || status === 'started' || status === 'pending') {
    document.getElementById('loading-spinner').style.display = 'inline-block';
  } else {
    document.getElementById('loading-spinner').style.display = 'none';
  }
}

function mapStatusToClass(status) {
  if (status === 'running' || status === 'started' || status === 'pending') return 'running';
  if (status === 'completed') return 'done';
  if (status === 'completed_with_errors' || status === 'failed') return 'fail';
  return 'running';
}

function displayError(msg) {
  const resultsDiv = $("#results");
  resultsDiv.innerHTML = `<div class="error-message" role="alert">${msg}</div>`;
  setTimeout(() => {
    const errEl = document.querySelector('.error-message');
    if (errEl) errEl.style.opacity = '0';
  }, 4000);
}

function clearResults() {
  $("#results").innerHTML = '';
  createProgressIndicator('pending');
}

function showLoading() {
  document.getElementById('loading-spinner').style.display = 'inline-block';
}

function hideLoading() {
  document.getElementById('loading-spinner').style.display = 'none';
}

export { createResultCard, createProgressIndicator as updateStatus, displayError, clearResults, showLoading, hideLoading };
