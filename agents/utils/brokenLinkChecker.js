const { request } = require('playwright');
const urlValidator = require('./urlValidator');

const brokenLinkChecker = {
    async checkLinks(page, links) {
        const base = new URL(page.url());
        const context = await request.newContext({ baseURL: base.origin, storageState: await page.context().storageState() });
        const concurrency = 8;
        const results = new Array(links.length);
        const queue = [];
        function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
        async function checkLink(link, idx, attempt = 1) {
            try {
                const target = urlValidator.toAbsolute(link.href, base);
                if (!urlValidator.isValid(target) || urlValidator.isDownload(target)) {
                    results[idx] = null;
                    return;
                }
                let resp = await context.head(target);
                if (resp.status() === 405) resp = await context.get(target);
                results[idx] = {
                    url: target,
                    status: resp.status(),
                    ok: resp.ok(),
                    error: resp.ok() ? null : resp.statusText(),
                    redirected: resp.status() >= 300 && resp.status() < 400
                };
            } catch (err) {
                // Retry for ENOTFOUND, 429, 502
                if ((/ENOTFOUND|429|502/.test(err.message)) && attempt < 4) {
                    await sleep(250 * Math.pow(2, attempt));
                    return checkLink(link, idx, attempt + 1);
                }
                results[idx] = { url: link.href, status: null, ok: false, error: err.message, redirected: false };
            }
        }
        let idx = 0;
        while (idx < links.length) {
            const batch = [];
            for (let i = 0; i < concurrency && idx < links.length; i++, idx++) {
                batch.push(checkLink(links[idx], idx));
            }
            await Promise.all(batch);
        }
        await context.dispose();
        return results.filter(r => r !== null);
    }
};

module.exports = brokenLinkChecker;
