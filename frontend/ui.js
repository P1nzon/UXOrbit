function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

function createResultCard(agentResult) {
  const card = document.createElement('div');
  card.className = 'result-card';
  const title = document.createElement('h4');
  title.textContent = `${agentResult.agentType.charAt(0).toUpperCase() + agentResult.agentType.slice(1)} Agent`;
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
    details.textContent = JSON.stringify(agentResult, null, 2);
    card.appendChild(details);
  }
  return card;
}

function updateStatus(status) {
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
}

function mapStatusToClass(status) {
  if (status === 'running' || status === 'started' || status === 'pending') return 'running';
  if (status === 'completed') return 'done';
  if (status === 'completed_with_errors' || status === 'failed') return 'fail';
  return 'running';
}

function displayError(msg) {
  const resultsDiv = $("#results");
  resultsDiv.innerHTML = `<div class="error-message">${msg}</div>`;
}

function clearResults() {
  $("#results").innerHTML = '';
  updateStatus('pending');
}

function showLoading() {
  const resultsDiv = $("#results");
  resultsDiv.innerHTML = '<div class="loading-spinner"></div>';
}

function hideLoading() {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) spinner.remove();
}

export { createResultCard, updateStatus, displayError, clearResults, showLoading, hideLoading };
