const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const ReportGenerator = require('./reportGenerator');
const logger = require('./logger');

class ExportManager {
  constructor(options = {}) {
    this.options = options;
    this.reportGenerator = new ReportGenerator();
  }

  async exportToJSON(results, metadata = {}, outPath) {
    try {
      await fs.outputJson(outPath, { metadata, results }, { spaces: 2 });
      return outPath;
    } catch (err) {
      logger.error('JSON export failed:', err);
      throw err;
    }
  }

  async exportToPDF(results, metadata = {}, outPath) {
    try {
      await fs.ensureDir(path.dirname(outPath));
      const html = await this.reportGenerator.generateDetailedReport(results, metadata);
      // Allow config override for Puppeteer launch options
      const launchOptions = this.options.puppeteerLaunchOptions || {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };
      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ path: outPath, format: 'A4', printBackground: true });
      await browser.close();
      return outPath;
    } catch (err) {
      logger.error('PDF export failed:', err);
      throw err;
    }
  }

  async exportToZIP(files, resOrPath) {
    if (typeof resOrPath === 'string') {
      // Write to file
      await fs.ensureDir(path.dirname(resOrPath));
      const output = fs.createWriteStream(resOrPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(output);
      for (const file of files) {
        archive.file(file.path, { name: file.name });
      }
      return new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.finalize();
      });
    } else {
      // Pipe directly to HTTP response
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', err => {
        logger.error('ZIP export failed:', err);
        resOrPath.status(500).json({ error: 'ZIP error', details: err.message });
      });
      archive.pipe(resOrPath);
      for (const file of files) {
        archive.file(file.path, { name: file.name });
      }
      archive.finalize();
    }
  }

  async exportToCSV(results, metadata = {}, outPath) {
    try {
      await fs.ensureDir(path.dirname(outPath));
      // Flatten results for CSV
      const agents = results.agents || [];
      const headers = ['Agent', 'Category', 'Severity', 'Score', 'Summary'];
      const rows = [headers.join(',')];
      agents.forEach(agent => {
        const usability = agent.results?.usabilityReport;
        if (usability) {
          (usability.issues || []).forEach(issue => {
            rows.push([
              agent.agentType,
              issue.type || '',
              issue.severity || '',
              results.scores?.usabilityScore ?? '',
              usability.summary?.replace(/,/g, ' ') || ''
            ].join(','));
          });
        }
      });
      // Add overall scores row
      rows.push(['Overall', '', '', results.scores?.usabilityScore ?? '', results.executiveSummary?.replace(/,/g, ' ') || '']);
      await fs.writeFile(outPath, rows.join('\n'), 'utf8');
      return outPath;
    } catch (err) {
      logger.error('CSV export failed:', err);
      throw err;
    }
  }
}

module.exports = ExportManager;
