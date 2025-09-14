// API routes for UXOrbit Multi-Agent Testing Dashboard
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AgentOrchestrator = require('../../agents/AgentOrchestrator');
const sessionManager = require('../utils/sessionManager');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ReportGenerator = require('../utils/reportGenerator');
const ExportManager = require('../utils/exportManager');
const ResultPersistence = require('../utils/resultPersistence');
const resultAggregator = require('../utils/resultAggregator');
const persistence = new ResultPersistence();
const fs = require('fs-extra');
const storageDirs = [
    '../../storage/results',
    '../../storage/reports',
    '../../storage/exports',
    '../../storage/archives',
    '../../storage/temp'
];
storageDirs.forEach(dir => {
    fs.ensureDir(path.resolve(__dirname, dir));
});
const reportGenerator = new ReportGenerator();
const exportManager = new ExportManager();

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// New: Generate HTML report
router.get('/reports/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    if (!uuidV4Regex.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid sessionId format.' });
    }
    try {
        const results = await persistence.loadResults(sessionId);
        const html = await reportGenerator.generateDetailedReport(results, results.metadata || {});
        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        logger.error('Report generation error:', err);
        res.status(500).json({ error: 'Failed to generate report.' });
    }
});

// New: PDF export
router.get('/reports/:sessionId/pdf', async (req, res) => {
    const sessionId = req.params.sessionId;
    if (!uuidV4Regex.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid sessionId format.' });
    }
    try {
        const results = await persistence.loadResults(sessionId);
        const pdfPath = path.join(__dirname, '../../storage/reports', `${sessionId}.pdf`);
        await exportManager.exportToPDF(results, results.metadata || {}, pdfPath);
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'PDF not found.' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', fs.statSync(pdfPath).size);
        const stream = fs.createReadStream(pdfPath);
        stream.pipe(res);
    } catch (err) {
        logger.error('PDF export error:', err);
        res.status(500).json({ error: 'Failed to export PDF.' });
    }
});

// New: JSON export
router.get('/reports/:sessionId/json', async (req, res) => {
    const sessionId = req.params.sessionId;
    if (!uuidV4Regex.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid sessionId format.' });
    }
    try {
        const results = await persistence.loadResults(sessionId);
        const jsonPath = path.join(__dirname, '../../storage/exports', `${sessionId}.json`);
        await exportManager.exportToJSON(results, results.metadata || {}, jsonPath);
        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'JSON not found.' });
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Length', fs.statSync(jsonPath).size);
        const stream = fs.createReadStream(jsonPath);
        stream.pipe(res);
    } catch (err) {
        logger.error('JSON export error:', err);
        res.status(500).json({ error: 'Failed to export JSON.' });
    }
});

// New: ZIP export
router.get('/reports/:sessionId/zip', async (req, res) => {
    const sessionId = req.params.sessionId;
    if (!uuidV4Regex.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid sessionId format.' });
    }
    try {
        const results = await persistence.loadResults(sessionId);
        const pdfPath = path.join(__dirname, '../../storage/reports', `${sessionId}.pdf`);
        const jsonPath = path.join(__dirname, '../../storage/exports', `${sessionId}.json`);
        // Ensure PDF exists
        if (!fs.existsSync(pdfPath)) {
            await exportManager.exportToPDF(results, results.metadata || {}, pdfPath);
        }
        // Ensure JSON exists
        if (!fs.existsSync(jsonPath)) {
            await exportManager.exportToJSON(results, results.metadata || {}, jsonPath);
        }
        const files = [
            { path: pdfPath, name: `${sessionId}.pdf` },
            { path: jsonPath, name: `${sessionId}.json` },
            // Add screenshots and other assets as needed
        ];
        // Check file sizes (limit to 100MB)
        const totalSize = files.reduce((sum, f) => sum + (fs.existsSync(f.path) ? fs.statSync(f.path).size : 0), 0);
        if (totalSize > 100 * 1024 * 1024) {
            return res.status(413).json({ error: 'Export too large.' });
        }
        res.set('Content-Type', 'application/zip');
        await exportManager.exportToZIP(files, res);
    } catch (err) {
        logger.error('ZIP export error:', err);
        res.status(500).json({ error: 'Failed to export ZIP.' });
    }
});

// New: Historical results
router.get('/results/history', async (req, res) => {
    // Placeholder: implement search/filter logic
    res.status(501).json({ error: 'Not implemented.' });
});

// New: Compare results
router.post('/results/compare', async (req, res) => {
    // Placeholder: implement comparison logic
    res.status(501).json({ error: 'Not implemented.' });
});

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
    let results;
    try {
        results = await persistence.loadResults(sessionId);
    } catch (err) {
        // Fallback to in-memory if persistence fails
        if (!sessionManager.sessionExists(sessionId)) {
            logger.warn(`Results requested for unknown session ${sessionId}`);
            return res.status(404).json({ error: 'Session not found' });
        }
        results = orchestrator.getResults(sessionId);
        if (!results) {
            logger.info(`Results not ready for session ${sessionId}`);
            return res.status(202).json({ status: 'pending' });
        }
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
