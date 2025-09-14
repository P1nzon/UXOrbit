const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS = 1000;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 min

class SessionManager {
    constructor() {
        this.sessions = new Map();
        setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
    }

    createSession(sessionId, url, agentTypes) {
        if (this.sessions.size >= MAX_SESSIONS) {
            // Evict oldest session(s)
            const sorted = Array.from(this.sessions.entries()).sort((a, b) => a[1].created - b[1].created);
            const toRemove = sorted.slice(0, this.sessions.size - MAX_SESSIONS + 1);
            toRemove.forEach(([id]) => this.sessions.delete(id));
            logger.info(`Max sessions reached, evicted oldest session(s).`);
        }
        if (this.sessions.size >= MAX_SESSIONS) {
            logger.error(`Session limit reached, cannot create new session.`);
            throw new Error('Session limit reached');
        }
        this.sessions.set(sessionId, {
            id: sessionId,
            url,
            agentTypes,
            status: 'pending',
            created: Date.now(),
            lastAccessed: Date.now(),
            results: null
        });
        logger.info(`Session created: ${sessionId}`);
    }

    sessionExists(sessionId) {
        return this.sessions.has(sessionId);
    }

    updateStatus(sessionId, status) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = status;
            session.lastAccessed = Date.now();
        }
    }

    storeResults(sessionId, results) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.results = results;
            session.lastAccessed = Date.now();
        }
    }

    getResults(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.results : null;
    }

    getStatus(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.status : 'not_found';
    }

    cleanup() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (now - session.lastAccessed > SESSION_TIMEOUT) {
                this.sessions.delete(id);
                logger.info(`Session ${id} expired and removed.`);
            }
        }
        // Limit max sessions
        if (this.sessions.size > MAX_SESSIONS) {
            const keys = Array.from(this.sessions.keys()).slice(0, this.sessions.size - MAX_SESSIONS);
            keys.forEach(id => this.sessions.delete(id));
            logger.info(`Max sessions exceeded, old sessions removed.`);
        }
    }
}

module.exports = new SessionManager();
