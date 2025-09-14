const domAnalyzer = {
    async analyze(page) {
        // Heading hierarchy
        const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', nodes => nodes.map(n => ({ tag: n.tagName, text: n.textContent.trim() })));
        // Semantic elements
        const semantics = await page.$$eval('nav, main, article, section, aside, header, footer', nodes => nodes.map(n => n.tagName));
        // Landmarks
        const landmarks = await page.$$eval('[role]', nodes => nodes.map(n => n.getAttribute('role')));
        // Forms
        const forms = await page.$$eval('form', nodes => nodes.length);
        // Images
        const images = await page.$$eval('img', nodes => nodes.map(n => ({ alt: n.getAttribute('alt'), src: n.getAttribute('src') })));
        // Links
        const links = await page.$$eval('a', nodes => nodes.map(n => ({ text: n.textContent.trim(), href: n.getAttribute('href') })));
        // Structure validation
        const htmlValid = await page.evaluate(() => {
            return document.documentElement instanceof HTMLElement && document.body instanceof HTMLElement;
        });
        // Unlabeled inputs
        const unlabeledInputs = await page.$$eval('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby]):not([placeholder])', nodes => nodes.filter(n => {
            if (n.labels && n.labels.length > 0) return false;
            return true;
        }).map(n => n.outerHTML));
        // Missing/empty alt text
        const missingAlts = images.filter(img => !img.alt || img.alt.trim() === '');
        // Heading hierarchy issues
        let headingIssues = [];
        let lastLevel = 0;
        headings.forEach(h => {
            const level = parseInt(h.tag.replace('H', ''));
            if (lastLevel && level > lastLevel + 1) {
                headingIssues.push(`Skipped heading level from H${lastLevel} to H${level}`);
            }
            lastLevel = level;
        });
        // Issues array
        const issues = [];
        if (!htmlValid) issues.push({ type: 'structure', severity: 'critical', message: 'Invalid HTML structure.' });
        if (headingIssues.length) headingIssues.forEach(msg => issues.push({ type: 'heading', severity: 'medium', message: msg }));
        if (unlabeledInputs.length) issues.push({ type: 'form', severity: 'high', message: 'Unlabeled input(s) found.', details: unlabeledInputs });
        if (missingAlts.length) issues.push({ type: 'image', severity: 'high', message: 'Missing or empty alt text on images.', details: missingAlts });
        // Score
        let score = 100 - (issues.length * 5);
        score = Math.max(0, Math.min(100, score));
        return {
            headings,
            semantics,
            landmarks,
            forms,
            images,
            links,
            htmlValid,
            issues,
            score
        };
    }
};

module.exports = domAnalyzer;
