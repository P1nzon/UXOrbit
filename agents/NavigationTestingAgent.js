const { chromium, firefox, webkit } = require('playwright');
const logger = require('../backend/utils/logger');
const path = require('path');
const config = require('../backend/config/playwright.config');
const screenshotCapture = require('./utils/screenshotCapture');
const linkDetector = require('./utils/linkDetector');
const urlValidator = require('./utils/urlValidator');
const performanceMonitor = require('./utils/performanceMonitor');
const navigationFlow = require('./utils/navigationFlow');
const brokenLinkChecker = require('./utils/brokenLinkChecker');
const { v4: uuidv4 } = require('uuid');

class NavigationTestingAgent {
    constructor(options = {}) {
        this.browserType = options.browserType || 'chromium';
        this.headless = options.headless !== undefined ? options.headless : (config.use?.headless ?? true);
        this.viewport = config.use?.viewport;
        this.baseURL = config.use?.baseURL;
        this.timeout = options.timeout || config.timeout || 30000;
        this.logger = logger;
        this.runId = uuidv4();
        this.screenshotDir = options.screenshotDir || path.resolve('screenshots', this.runId);
        this.screenshotBaseUrl = options.screenshotBaseUrl || '/static/screenshots';
    }

    async launchBrowser() {
        const engines = { chromium, firefox, webkit };
        const browserEngine = engines[this.browserType] || chromium;
        this.browser = await browserEngine.launch({ headless: this.headless });
        const contextOptions = {};
        if (this.viewport) contextOptions.viewport = this.viewport;
        if (this.baseURL) contextOptions.baseURL = this.baseURL;
        this.context = await this.browser.newContext(contextOptions);
        this.page = await this.context.newPage();
        this.logger.info(`Browser launched (${this.browserType})`);
    }

    async navigate(url) {
        let targetUrl = url;
        if (this.baseURL && !/^https?:\/\//.test(url)) {
            targetUrl = new URL(url, this.baseURL).toString();
        }
        await this.page.goto(targetUrl, { timeout: this.timeout });
        this.logger.info(`Navigated to ${targetUrl}`);
    }

    async detectLinks() {
        return await linkDetector.detectLinks(this.page);
    }

    async validateLinks(links) {
        const screenshots = await linkDetector.validateLinks(this.page, links, screenshotCapture, this.screenshotDir, this.timeout);
        // Normalize screenshot paths for report
        if (Array.isArray(screenshots)) {
            return screenshots.map(s => ({
                ...s,
                url: `${this.screenshotBaseUrl}/${this.runId}/${s.filename}`
            }));
        }
        return screenshots;
    }

    async checkBrokenLinks(links) {
        return await brokenLinkChecker.checkLinks(this.page, links);
    }

    async testNavigationFlows(flows) {
        return await navigationFlow.testFlows(this.page, flows, screenshotCapture, this.screenshotDir);
    }

    async measurePageLoad() {
        return await performanceMonitor.measure(this.page);
    }

    async generateReport(results) {
        const screenshots = await screenshotCapture.list(this.screenshotDir);
        let normalizedScreenshots = screenshots;
        if (Array.isArray(screenshots)) {
            normalizedScreenshots = screenshots.map(s => ({
                ...s,
                url: `${this.screenshotBaseUrl}/${this.runId}/${s.filename}`
            }));
        }
        return {
            runId: this.runId,
            results,
            screenshots: normalizedScreenshots,
        };
    }

    async run(url, flows = []) {
        let results = {};
        try {
            await this.launchBrowser();
            await this.navigate(url);
            const links = await this.detectLinks();
            results.linkValidation = await this.validateLinks(links);
            results.brokenLinks = await this.checkBrokenLinks(links);
            results.performance = await this.measurePageLoad();
            results.navigationFlows = await this.testNavigationFlows(flows);
        } catch (err) {
            this.logger.error(`Fatal error: ${err.message}`);
            if (this.page) {
                await screenshotCapture.capture(this.page, this.screenshotDir, 'fatal_error');
            }
        } finally {
            if (this.browser) await this.browser.close();
        }
        return await this.generateReport(results);
    }
}

module.exports = NavigationTestingAgent;
