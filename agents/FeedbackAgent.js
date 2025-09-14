const { chromium, firefox, webkit } = require('playwright');
const logger = require('../backend/utils/logger');
const path = require('path');
const config = require('../backend/config/playwright.config');
const screenshotCapture = require('./utils/screenshotCapture');
const performanceMonitor = require('./utils/performanceMonitor');
const domAnalyzer = require('./utils/domAnalyzer');
const accessibilityChecker = require('./utils/accessibilityChecker');
const screenshotAnalyzer = require('./utils/screenshotAnalyzer');
const insightGenerator = require('./utils/insightGenerator');
const { v4: uuidv4 } = require('uuid');

class FeedbackAgent {
    constructor(options = {}) {
        this.browserType = options.browserType || 'chromium';
        this.headless = options.headless !== undefined ? options.headless : (config.use?.headless ?? true);
        this.viewport = config.use?.viewport;
        this.baseURL = config.use?.baseURL;
        this.timeout = options.timeout || config.timeout || 30000;
        this.logger = logger;
        this.runId = uuidv4();
        this.screenshotDir = options.screenshotDir || path.resolve('screenshots', this.runId);
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

    async analyzeDOMStructure() {
        return await domAnalyzer.analyze(this.page);
    }

    async runAccessibilityChecks() {
        return await accessibilityChecker.check(this.page);
    }

    async collectPerformanceMetrics() {
        return await performanceMonitor.measure(this.page);
    }

    async analyzeScreenshots() {
        return await screenshotAnalyzer.analyze(this.page, this.screenshotDir);
    }

    async generateUsabilityReport(domResults, accessibilityResults, perfResults, screenshotResults) {
        return await insightGenerator.generate(domResults, accessibilityResults, perfResults, screenshotResults);
    }

    async generateReport(results) {
        return {
            runId: this.runId,
            results,
            screenshots: await screenshotCapture.list(this.screenshotDir),
        };
    }

    async run(url) {
        let results = {};
        const breakpoints = [
            { width: 375, height: 667 }, // mobile
            { width: 768, height: 1024 }, // tablet
            { width: 1280, height: 800 } // desktop
        ];
        try {
            await this.launchBrowser();
            await performanceMonitor.init(this.page);
            await this.navigate(url);
            const perfResults = await performanceMonitor.collect(this.page);
            const domResults = await this.analyzeDOMStructure();
            const accessibilityResults = await this.runAccessibilityChecks();
            for (const bp of breakpoints) {
                await this.page.setViewportSize(bp);
                await screenshotCapture.capture(this.page, this.screenshotDir, `viewport_${bp.width}x${bp.height}`);
            }
            const screenshotResults = await this.analyzeScreenshots();
            results.usabilityReport = await this.generateUsabilityReport(domResults, accessibilityResults, perfResults, screenshotResults);
            results.domAnalysis = domResults;
            results.accessibility = accessibilityResults;
            results.performance = perfResults;
            results.screenshots = screenshotResults;
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

module.exports = FeedbackAgent;
