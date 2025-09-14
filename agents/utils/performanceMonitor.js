const performanceMonitor = {
    async measure(page) {
        // Inject observer for LCP/CLS before navigation
        await page.addInitScript(() => {
            window.__lcp = 0;
            window.__cls = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                        window.__lcp = entry.startTime;
                    }
                    if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                        window.__cls += entry.value;
                    }
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                        window.__cls += entry.value;
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });
        });
        // Wait for navigation
        await page.waitForLoadState('load');
        const nav = await page.evaluate(() => {
            const n = performance.getEntriesByType('navigation')[0];
            return n ? {
                domContentLoaded: n.domContentLoadedEventEnd,
                load: n.loadEventEnd,
                start: n.startTime
            } : null;
        });
        const fcp = await page.evaluate(() => {
            const entries = performance.getEntriesByType('paint');
            const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
            return fcpEntry ? fcpEntry.startTime : null;
        });
        const lcp = await page.evaluate(() => window.__lcp);
        const cls = await page.evaluate(() => window.__cls);
        const resourceCounts = await page.evaluate(() => {
            const types = {};
            performance.getEntriesByType('resource').forEach(r => {
                types[r.initiatorType] = (types[r.initiatorType] || 0) + 1;
            });
            return types;
        });
        return {
            loadTime: nav ? nav.load - nav.start : null,
            domContentLoaded: nav ? nav.domContentLoaded - nav.start : null,
            firstContentfulPaint: fcp,
            largestContentfulPaint: lcp,
            cumulativeLayoutShift: cls,
            resourceCounts
        };
    }
};

module.exports = performanceMonitor;
