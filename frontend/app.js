import { startTesting, getStatus, getResults } from './api.js';
import { createResultCard, updateStatus, displayError, clearResults, showLoading, hideLoading } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('website-url');
  const agentCheckboxes = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'));
  const startButton = document.getElementById('start-agents');
  const resultsDiv = document.getElementById('results');

  let sessionId = null;
  let pollingInterval = null;

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
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
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
      pollStatus();
    } catch (err) {
      displayError(err.message);
      hideLoading();
    } finally {
      // Re-enable after results fetched or on error
      // This is also handled in pollStatus error/failure paths
    }
  });

  async function pollStatus() {
    pollingInterval = setInterval(async () => {
      try {
        const statusResp = await getStatus(sessionId);
        if (statusResp.error) {
          throw new Error(statusResp.error);
        }
        if (!statusResp.status) {
          throw new Error('No status returned');
        }
        if (statusResp.status === 'failed') {
          clearInterval(pollingInterval);
          updateStatus('failed');
          hideLoading();
          startButton.disabled = false;
          return;
        }
        if (statusResp.status === 'completed' || statusResp.status === 'completed_with_errors') {
          clearInterval(pollingInterval);
          updateStatus(statusResp.status);
          fetchResults();
        } else {
          updateStatus(statusResp.status);
        }
      } catch (err) {
        displayError('Error checking status: ' + err.message);
        clearInterval(pollingInterval);
        hideLoading();
        startButton.disabled = false;
      }
    }, 2000);
  }

  async function fetchResults() {
    try {
      const resultsResp = await getResults(sessionId);
      if (resultsResp.error) {
        hideLoading();
        displayError('Error fetching results: ' + resultsResp.error);
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
        return;
      }
      document.addEventListener('DOMContentLoaded', () => {
        const urlInput = document.getElementById('website-url');
        const agentCheckboxes = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]'));
        const startButton = document.getElementById('start-agents');
        const resultsDiv = document.getElementById('results');
        const testForm = document.getElementById('test-form');

        let sessionId = null;
        let pollingInterval = null;

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
          if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
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
            pollStatus();
          } catch (err) {
            displayError(err.message);
            hideLoading();
          } finally {
            // Re-enable after results fetched or on error
            // This is also handled in pollStatus error/failure paths
          }
        });

        testForm.addEventListener('submit', (e) => {
          e.preventDefault();
          startButton.click();
        });

        async function pollStatus() {
          pollingInterval = setInterval(async () => {
            try {
              const statusResp = await getStatus(sessionId);
              if (statusResp.error) {
                throw new Error(statusResp.error);
              }
              if (!statusResp.status) {
                throw new Error('No status returned');
              }
              if (statusResp.status === 'failed') {
                clearInterval(pollingInterval);
                updateStatus('failed');
                hideLoading();
                startButton.disabled = false;
                return;
              }
              if (statusResp.status === 'completed' || statusResp.status === 'completed_with_errors') {
                clearInterval(pollingInterval);
                updateStatus(statusResp.status);
                fetchResults();
              } else {
                updateStatus(statusResp.status);
              }
            } catch (err) {
              displayError('Error checking status: ' + err.message);
              clearInterval(pollingInterval);
              hideLoading();
              startButton.disabled = false;
            }
          }, 2000);
        }

        async function fetchResults() {
          try {
            const resultsResp = await getResults(sessionId);
            if (resultsResp.error) {
              hideLoading();
              displayError('Error fetching results: ' + resultsResp.error);
              return;
            }
            const agents = Array.isArray(resultsResp?.results?.agents)
              ? resultsResp.results.agents
              : Array.isArray(resultsResp?.agents)
                ? resultsResp.agents
                : null;
            if (!agents) {
              displayError('No results found.');
              return;
            }
            agents.forEach(agentResult => {
              const card = createResultCard(agentResult);
              resultsDiv.appendChild(card);
            });
          } catch (err) {
            displayError('Error fetching results: ' + err.message);
          }
        }
      });
