const fs = require('fs');
const path = require('path');

const screenshotAnalyzer = {
    async analyze(page, screenshotDir) {
        if (!fs.existsSync(screenshotDir)) return [];
        const files = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
        // DOM geometry checks
        const overflowIssues = await page.evaluate(() => {
            const issues = [];
            document.querySelectorAll('*').forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
                    issues.push({ tag: el.tagName, class: el.className, style: el.style.cssText, rect });
                }
            });
            return issues;
        });
        // Overlap check (simple)
        const overlapIssues = await page.evaluate(() => {
            const issues = [];
            const elements = Array.from(document.querySelectorAll('*'));
            for (let i = 0; i < elements.length; i++) {
                for (let j = i + 1; j < elements.length; j++) {
                    const r1 = elements[i].getBoundingClientRect();
                    const r2 = elements[j].getBoundingClientRect();
                    if (r1.width && r1.height && r2.width && r2.height) {
                        if (!(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom)) {
                            issues.push({ el1: elements[i].tagName, el2: elements[j].tagName, r1, r2 });
                        }
                    }
                }
            }
            return issues;
        });
        return {
            screenshots: files.map(f => ({ file: f, path: path.join(screenshotDir, f) })),
            overflowIssues,
            overlapIssues
        };
    }
};

module.exports = screenshotAnalyzer;
