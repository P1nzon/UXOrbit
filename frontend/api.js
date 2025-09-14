const API_BASE = '/api';

function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

async function fetchWithTimeout(resource, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function startTesting(url, agents) {
  try {
    const resp = await fetchWithTimeout(buildApiUrl('/start-testing'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, agents })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'API error');
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

async function getStatus(sessionId, retries = 2, delay = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetchWithTimeout(buildApiUrl(`/status/${sessionId}`));
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'API error');
      return data;
    } catch (err) {
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt)));
        continue;
      }
      return { error: err.message };
    }
  }
}

async function getResults(sessionId) {
  try {
    const resp = await fetchWithTimeout(buildApiUrl(`/get-results/${sessionId}`));
    const data = await resp.json();
    if (!resp.ok && resp.status !== 202) throw new Error(data.error || 'API error');
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

export { startTesting, getStatus, getResults };
