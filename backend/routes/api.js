// API routes for UXOrbit Multi-Agent Testing Dashboard
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AgentOrchestrator = require('../../agents/AgentOrchestrator');
const sessionManager = require('../utils/sessionManager');
const { v4: uuidv4 } = require('uuid');

const orchestrator = new AgentOrchestrator();

/**
 * @route GET /api/health
 * @desc Health check endpoint
 * @returns { status: 'ok' }
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * @route POST /api/start-testing
 * @desc Initiate agent testing
 * @body { agents: [string], url: string }
 * @returns { sessionId: string, status: 'started' }
 */
router.post('/start-testing', async (req, res) => {
    const { url, agents } = req.body;
    const allowedAgents = ['form', 'navigation', 'feedback'];
    if (!url || !Array.isArray(agents) || !agents.length) {
        logger.warn('Invalid start-testing request');
        return res.status(400).json({ error: 'Missing url or agents array' });
    }
    if (agents.some(a => !allowedAgents.includes(a))) {
        logger.warn('Unknown agent type in start-testing request');
        return res.status(400).json({ error: 'Unknown agent type requested' });
    }
    const sessionId = uuidv4();
    try {
        orchestrator.sessions.createSession(sessionId, url, agents);
        orchestrator.sessions.updateStatus(sessionId, 'pending');
        setImmediate(() => {
            (async () => {
                try {
                    await orchestrator.startTesting(sessionId, url, agents);
                } catch (err) {
                    logger.error(`Async session ${sessionId} failed: ${err.message}`);
                    orchestrator.sessions.storeResults(sessionId, { error: err.message });
                    orchestrator.sessions.updateStatus(sessionId, 'failed');
                }
            })();
        });
        logger.info(`Testing started for session ${sessionId}`);
        res.status(202).json({ sessionId, status: 'started' });
    } catch (err) {
        logger.error(`Failed to start testing: ${err.message}`);
        res.status(500).json({ error: 'Failed to start testing' });
    }
});

/**
 * @route GET /api/get-results/:sessionId
 * @desc Retrieve test results for a session
 * @returns { results: object }
 */
router.get('/get-results/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionManager.sessionExists(sessionId)) {
        logger.warn(`Results requested for unknown session ${sessionId}`);
        return res.status(404).json({ error: 'Session not found' });
    }
    const results = orchestrator.getResults(sessionId);
    if (!results) {
        logger.info(`Results not ready for session ${sessionId}`);
        return res.status(202).json({ status: 'pending' });
    }
    res.status(200).json({ results });
});

/**
 * @route GET /api/status/:sessionId
 * @desc Check test status for a session
 * @returns { status: string }
 */
router.get('/status/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionManager.sessionExists(sessionId)) {
        logger.warn(`Status requested for unknown session ${sessionId}`);
        return res.status(404).json({ error: 'Session not found' });
    }
    const status = orchestrator.getStatus(sessionId);
    res.status(200).json({ status });
});

module.exports = router;
