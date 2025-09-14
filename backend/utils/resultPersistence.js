const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class ResultPersistence {
  constructor(options = {}) {
    this.options = options;
    this.baseDir = path.resolve(__dirname, '../../storage');
    this.resultsDir = path.join(this.baseDir, 'results');
    this.archivesDir = path.join(this.baseDir, 'archives');
  }

  async saveResults(sessionId, results) {
    try {
      const outPath = path.join(this.resultsDir, `${sessionId}.json`);
      await fs.outputJson(outPath, results, { spaces: 2 });
      return outPath;
    } catch (err) {
      logger.error('Failed to save results:', err);
      throw err;
    }
  }

  async loadResults(sessionId) {
    try {
      const inPath = path.join(this.resultsDir, `${sessionId}.json`);
      return await fs.readJson(inPath);
    } catch (err) {
      logger.error('Failed to load results:', err);
      throw err;
    }
  }

  async archiveResults(sessionId) {
    try {
      const srcPath = path.join(this.resultsDir, `${sessionId}.json`);
      const destPath = path.join(this.archivesDir, `${sessionId}.json`);
      await fs.move(srcPath, destPath, { overwrite: true });
      return destPath;
    } catch (err) {
      logger.error('Failed to archive results:', err);
      throw err;
    }
  }

  async cleanupResults(maxAgeDays = 30) {
    // Implement cleanup logic for old results
    // Placeholder for future extension
  }
}

module.exports = ResultPersistence;
