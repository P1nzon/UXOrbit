const { v4: uuidv4 } = require('uuid');
const FormFillingAgent = require('./FormFillingAgent');
const NavigationTestingAgent = require('./NavigationTestingAgent');
const FeedbackAgent = require('./FeedbackAgent');
const logger = require('../backend/utils/logger');
const resultAggregator = require('../backend/utils/resultAggregator');
const sessionManager = require('../backend/utils/sessionManager');

class AgentOrchestrator {
    constructor(options = {}) {
        this.options = options;
        this.sessions = sessionManager;
    }

    async startTesting(sessionId, url, agentTypes = ['form', 'navigation', 'feedback']) {
        if (!this.sessions.sessionExists(sessionId)) {
            logger.error(`Session ${sessionId} does not exist. Aborting agent execution.`);
            return { error: 'Session does not exist' };
        }
        this.sessions.updateStatus(sessionId, 'running');
        logger.info(`Session ${sessionId} started for agents: ${agentTypes.join(', ')}`);
        let aggregated = null;
        try {
            const agentMap = {
                form: FormFillingAgent,
                navigation: NavigationTestingAgent,
                feedback: FeedbackAgent
            };
            const promises = agentTypes.map(type => {
                const AgentClass = agentMap[type];
                if (!AgentClass) return Promise.resolve({ error: `Unknown agent type: ${type}`, agentType: type });
                const agent = new AgentClass();
                return agent.run(url)
                    .then(result => ({ ...result, agentType: type }))
                    .catch(err => ({ error: err.message, agentType: type }));
            });
            const agentResults = await Promise.all(promises);
            aggregated = resultAggregator.aggregate(agentResults);
            const hasErrors = agentResults.some(r => r.error);
            this.sessions.storeResults(sessionId, aggregated);
            this.sessions.updateStatus(sessionId, hasErrors ? 'completed_with_errors' : 'completed');
            logger.info(`Session ${sessionId} completed${hasErrors ? ' with errors' : ''}.`);
            return aggregated;
        } catch (err) {
            logger.error(`Session ${sessionId} failed: ${err.message}`);
            this.sessions.storeResults(sessionId, { error: err.message });
            this.sessions.updateStatus(sessionId, 'failed');
            return { error: err.message };
        } finally {
            // Optionally, cleanup or additional logging
        }
    }

    getResults(sessionId) {
        if (!this.sessions.sessionExists(sessionId)) return null;
        return this.sessions.getResults(sessionId);
    }

    getStatus(sessionId) {
        if (!this.sessions.sessionExists(sessionId)) return 'not_found';
        return this.sessions.getStatus(sessionId);
    }
}

module.exports = AgentOrchestrator;
