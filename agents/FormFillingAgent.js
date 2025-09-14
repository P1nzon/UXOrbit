const { chromium, firefox, webkit } = require('playwright');
const logger = require('../backend/utils/logger');
const path = require('path');
const config = require('../backend/config/playwright.config');
const testDataGenerator = require('./utils/testDataGenerator');
const fieldSelector = require('./utils/fieldSelector');
const formValidator = require('./utils/formValidator');
const screenshotCapture = require('./utils/screenshotCapture');

const { v4: uuidv4 } = require('uuid');

class FormFillingAgent {
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

    async detectForms() {
        const forms = await this.page.$$('form');
        this.logger.info(`Detected ${forms.length} forms on page`);
        return forms;
    }

    async identifyFields(form) {
        return await fieldSelector.identifyFields(this.page, form);
    }

    async fillForm(form, testData, formIndex = 0) {
        const formDir = path.join(this.screenshotDir, `form_${formIndex}`);
        const fields = await this.identifyFields(form);
        for (const field of fields) {
            try {
                // Use semantic key for mapping
                const value = testData[field.semantic] ?? testData[field.name] ?? testData[field.id] ?? field.default ?? '';
                await fieldSelector.fillField(this.page, field, value);
                this.logger.info(`Filled field: ${field.semantic || field.name}`);
                await screenshotCapture.capture(this.page, formDir, 'field', field.semantic || field.name, field.element);
            } catch (err) {
                this.logger.error(`Error filling field ${field.semantic || field.name}: ${err.message}`);
                await screenshotCapture.capture(this.page, formDir, 'error', field.semantic || field.name, field.element);
            }
        }
    }

    async submitForm(form, formIndex = 0) {
        const formDir = path.join(this.screenshotDir, `form_${formIndex}`);
        try {
            await form.evaluate(f => {
                if (typeof f.requestSubmit === 'function') {
                    f.requestSubmit();
                } else {
                    const btn = f.querySelector('[type="submit"]');
                    if (btn) btn.click();
                    else f.submit();
                }
            });
            this.logger.info('Form submitted');
        } catch (err) {
            this.logger.error(`Error submitting form: ${err.message}`);
            await screenshotCapture.capture(this.page, formDir, 'submit_error');
        }
    }

    async validateForm() {
        return await formValidator.validate(this.page);
    }

    async generateReport(result, formIndex = 0) {
        // Structure results for API consumption
        const formDir = path.join(this.screenshotDir, `form_${formIndex}`);
        return {
            success: result.success,
            errors: result.errors,
            screenshots: await screenshotCapture.list(formDir),
        };
    }

    async run(url) {
        let results = [];
        try {
            await this.launchBrowser();
            await this.navigate(url);
            const forms = await this.detectForms();
            const testData = testDataGenerator.generate();
            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];
                const formDir = path.join(this.screenshotDir, `form_${i}`);
                await screenshotCapture.capture(this.page, formDir, 'baseline');
                await this.fillForm(form, testData, i);
                await screenshotCapture.capture(this.page, formDir, 'filled');
                await this.submitForm(form, i);
                await screenshotCapture.capture(this.page, formDir, 'result');
                const validation = await this.validateForm();
                results.push(await this.generateReport(validation, i));
            }
        } catch (err) {
            this.logger.error(`Fatal error: ${err.message}`);
            if (this.page) {
                await screenshotCapture.capture(this.page, this.screenshotDir, 'fatal_error');
            }
        } finally {
            if (this.browser) await this.browser.close();
        }
        return results;
    }
}

module.exports = FormFillingAgent;
