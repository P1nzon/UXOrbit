const fs = require('fs');
const path = require('path');

const screenshotCapture = {
    async capture(page, dir, type, fieldName = '', element = null) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${type}${fieldName ? '_' + fieldName : ''}_${timestamp}.png`;
        const filepath = path.join(dir, filename);
        if (element) {
            // Annotate field by drawing a red outline before screenshot
            await element.evaluate(el => {
                el.__originalOutline = el.style.outline;
                el.style.outline = '3px solid red';
            });
            await page.screenshot({ path: filepath, fullPage: true });
            await element.evaluate(el => {
                el.style.outline = el.__originalOutline || '';
                delete el.__originalOutline;
            });
        } else {
            await page.screenshot({ path: filepath, fullPage: true });
        }
        return filepath;
    },
    async list(dir) {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir).filter(f => f.endsWith('.png')).map(f => path.join(dir, f));
    }
};

module.exports = screenshotCapture;
