const Handlebars = require('handlebars');
const moment = require('moment');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class TemplateManager {
  constructor(templateDir) {
    this.templateDir = templateDir;
  }
  async load(templateName) {
    const filePath = path.join(this.templateDir, templateName);
    if (!fs.existsSync(filePath)) throw new Error(`Template not found: ${templateName}`);
    return fs.readFile(filePath, 'utf8');
  }
  exists(templateName) {
    return fs.existsSync(path.join(this.templateDir, templateName));
  }
}

class ReportGenerator {
  constructor(options = {}) {
    this.options = options;
    this.templateDir = path.resolve(__dirname, '../templates');
    this.templateManager = new TemplateManager(this.templateDir);
  }

  async loadTemplate(templateName) {
    return this.templateManager.load(templateName);
  }

  async generateDetailedReport(results, metadata = {}) {
    try {
      const templateSrc = await this.loadTemplate('technicalReport.hbs');
      const template = Handlebars.compile(templateSrc);
      const styles = await fs.readFile(path.join(this.templateDir, 'styles.css'), 'utf8');
      const context = {
        metadata,
        results,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
      };
      let html = template(context);
      html = `<style>${styles}</style>` + html;
      return html;
    } catch (err) {
      logger.error('Report generation failed:', err);
      throw err;
    }
  }

  async generateExecutiveSummary(results, metadata = {}) {
    try {
      const templateSrc = await this.loadTemplate('executiveSummary.hbs');
      const template = Handlebars.compile(templateSrc);
      const styles = await fs.readFile(path.join(this.templateDir, 'styles.css'), 'utf8');
      const context = {
        metadata,
        results,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
      };
      let html = template(context);
      html = `<style>${styles}</style>` + html;
      return html;
    } catch (err) {
      logger.error('Executive summary generation failed:', err);
      throw err;
    }
  }

  async generateTechnicalReport(results, metadata = {}) {
    return this.generateDetailedReport(results, metadata);
  }

  async generateComparisonReport(resultsList, metadata = {}) {
    // TODO: Implement comparisonReport.hbs template and logic
    if (!this.templateManager.exists('comparisonReport.hbs')) {
      throw new Error('Comparison report template not implemented.');
    }
    try {
      const templateSrc = await this.loadTemplate('comparisonReport.hbs');
      const template = Handlebars.compile(templateSrc);
      const context = {
        metadata,
        resultsList,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
      };
      return template(context);
    } catch (err) {
      logger.error('Comparison report generation failed:', err);
      throw err;
    }
  }
}

module.exports = ReportGenerator;
