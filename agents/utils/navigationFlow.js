const performanceMonitor = require('./performanceMonitor');

const navigationFlow = {
    async testFlows(page, flows, screenshotCapture, screenshotDir) {
        let results = [];
        for (const flow of flows) {
            let flowResult = { steps: [], success: true };
            for (let i = 0; i < flow.length; i++) {
                const step = flow[i];
                const stepResult = { ...step, success: true, error: null, timing: null };
                try {
                    if (step.action === 'click') {
                        const el = await page.$(step.selector);
                        if (el) {
                            await el.scrollIntoViewIfNeeded();
                            await screenshotCapture.capture(page, screenshotDir, `flow_step_${i}`, step.selector, el);
                            await el.click();
                        } else {
                            throw new Error('Element not found');
                        }
                    } else if (step.action === 'goto') {
                        await page.goto(step.url);
                        await screenshotCapture.capture(page, screenshotDir, `flow_step_${i}`, step.url);
                    }
                    // Validation expectations
                    if (step.expect) {
                        if (step.expect.waitForSelector) {
                            await page.waitForSelector(step.expect.waitForSelector, { state: 'visible', timeout: 10000 });
                        }
                        if (step.expect.urlIncludes) {
                            await page.waitForURL(new RegExp(step.expect.urlIncludes), { timeout: 10000 });
                        }
                        if (step.expect.textVisible) {
                            await page.waitForSelector(`text=${step.expect.textVisible}`, { timeout: 10000 });
                        }
                        await screenshotCapture.capture(page, screenshotDir, `flow_step_${i}_validation`, step.expect.waitForSelector || step.expect.urlIncludes || step.expect.textVisible);
                    }
                    // Timing metrics
                    stepResult.timing = await performanceMonitor.measure(page);
                } catch (err) {
                    flowResult.success = false;
                    stepResult.success = false;
                    stepResult.error = err.message;
                }
                flowResult.steps.push(stepResult);
                if (!stepResult.success) break;
            }
            results.push(flowResult);
        }
        return results;
    }
};

module.exports = navigationFlow;
