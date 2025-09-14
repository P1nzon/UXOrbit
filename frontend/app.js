import { startTesting, getStatus, getResults } from './api.js';
import { createResultCard, updateStatus, displayError, clearResults, showLoading, hideLoading } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('website-url');
  const agentCheckboxes = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'));
  const startButton = document.getElementById('start-agents');
  const resultsDiv = document.getElementById('results');
  const testForm = document.getElementById('test-form');

  let sessionId = null;

  function validateURL(url) {
    try {
      new URL(url);
      return /^https?:\/\//.test(url);
    } catch {
      return false;
    }
  }

  function validateAgentSelection() {
    return agentCheckboxes.some(cb => cb.checked);
  }

  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    clearResults();
    const url = urlInput.value.trim();
    const agents = agentCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    if (!validateURL(url)) {
      displayError('Please enter a valid URL.');
      startButton.disabled = false;
      return;
    }
    if (!validateAgentSelection()) {
      displayError('Please select at least one agent.');
      startButton.disabled = false;
      return;
    }
    showLoading();
    try {
      const response = await startTesting(url, agents);
      if (!response.sessionId) throw new Error(response.error || 'Failed to start testing');
      sessionId = response.sessionId;
      updateStatus('started');
      await pollStatus();
    } catch (err) {
      displayError(err.message);
      hideLoading();
      startButton.disabled = false;
    }
  });

  testForm.addEventListener('submit', (e) => {
    e.preventDefault();
    startButton.click();
  });

  async function pollStatus() {
    let delay = 2000;
    try {
      while (true) {
        const statusResp = await getStatus(sessionId);
        if (statusResp.error) throw new Error(statusResp.error);
        updateStatus(statusResp.status);
        if (["failed","completed","completed_with_errors"].includes(statusResp.status)) break;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 10000);
      }
      if (statusResp.status === "failed") {
        hideLoading();
        startButton.disabled = false;
      } else {
        await fetchResults();
      }
    } catch (err) {
      displayError('Error checking status: ' + err.message);
      hideLoading();
      startButton.disabled = false;
    }
  }

  async function fetchResults() {
    try {
      const resultsResp = await getResults(sessionId);
      if (resultsResp.error) {
        hideLoading();
        displayError('Error fetching results: ' + resultsResp.error);
        startButton.disabled = false;
        return;
      }
      hideLoading();
      const agents = Array.isArray(resultsResp?.results?.agents)
        ? resultsResp.results.agents
        : Array.isArray(resultsResp?.agents)
          ? resultsResp.agents
          : null;
      if (!agents) {
        displayError('No results found.');
        startButton.disabled = false;
        return;
      }
      agents.forEach(agentResult => {
        const card = createResultCard(agentResult);
        resultsDiv.appendChild(card);
      });
      startButton.disabled = false;
    } catch (err) {
      hideLoading();
      displayError('Error fetching results: ' + err.message);
      startButton.disabled = false;
    }
  }
});
