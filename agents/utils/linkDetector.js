const linkDetector = {
    async detectLinks(page) {
        const urlValidator = require('./urlValidator');
        // Selectors for robust link detection
        const selectors = [
            'a[href]',
            'area[href]',
            '[role="link"]',
            '[onclick*="location"]',
            '[data-nav]',
            '[data-link]',
            'button[formaction]'
        ];
        const elements = await page.$$(selectors.join(','));
        let links = [];
        for (const el of elements) {
            const href = await el.getAttribute('href') || await el.getAttribute('formaction') || '';
            const absoluteHref = urlValidator.toAbsolute(href, await page.url());
            const text = await el.textContent();
            const ariaLabel = await el.getAttribute('aria-label');
            const title = await el.getAttribute('title');
            const rect = await el.evaluate(e => e.getBoundingClientRect());
            const visible = rect.width > 0 && rect.height > 0;
            // Exclude mailto, tel, javascript, hidden
            if (/^(mailto:|tel:|javascript:)/i.test(href) || !visible) continue;
            const comps = urlValidator.extractComponents(absoluteHref);
            const type = urlValidator.isDownload(absoluteHref) ? 'download'
                : comps.hash && (!comps.pathname || comps.pathname === '' || comps.pathname === '/') ? 'anchor'
                : urlValidator.isInternal(absoluteHref, await page.url()) ? 'internal'
                : 'external';
            links.push({
                href,
                absoluteHref,
                text: text?.trim(),
                ariaLabel,
                title,
                type,
                visible,
                element: el
            });
        }
        return links;
    },
    async validateLinks(page, links, screenshotCapture, screenshotDir, timeout = 10000) {
        const urlValidator = require('./urlValidator');
        let results = [];
    for (const link of links) {
            try {
                // Anchor-only (in-page navigation)
                if (link.type === 'anchor') {
                    const originalHash = await page.evaluate(() => location.hash);
                    await link.element.click();
                    await page.waitForTimeout(200); // allow hash change
                    const newHash = await page.evaluate(() => location.hash);
                    const changed = originalHash !== newHash;
                    results.push({ href: link.href, success: changed, status: null, type: 'anchor', inPage: true });
                    continue;
                }
                // Downloads
                if (link.type === 'download') {
                    results.push({ href: link.href, success: true, status: null, type: 'download' });
                    continue;
                }
                // External/internal navigation
                const target = link.absoluteHref;
                const p = await page.context().newPage();
                const resp = await p.goto(target, { waitUntil: 'load', timeout });
                await screenshotCapture.capture(p, screenshotDir, 'link_validation', link.text || link.href);
                results.push({
                    href: link.href,
                    absoluteHref: link.absoluteHref,
                    success: !!resp,
                    status: resp?.status(),
                    type: link.type
                });
                await p.close();
            } catch (err) {
                results.push({ href: link.href, success: false, error: err.message, type: link.type });
            }
        }
    return results;
    }
};

module.exports = linkDetector;
