const fieldSelector = {
    async identifyFields(page, form) {
        // Only interactive fields
        const fields = await form.$$('input, textarea, select, [contenteditable]');
        let result = [];
        for (const field of fields) {
            const tag = await field.evaluate(el => el.tagName.toLowerCase());
            let type = tag;
            if (tag === 'input') {
                type = await field.getAttribute('type') || 'text';
            } else if (tag === 'select') {
                type = 'select';
            } else if (tag === 'textarea') {
                type = 'textarea';
            }
            // Skip hidden/disabled
            const isHidden = await field.evaluate(el => el.offsetParent === null || el.hidden || el.type === 'hidden');
            const isDisabled = await field.evaluate(el => el.disabled);
            if (isHidden || isDisabled) continue;
            // Semantic key: label, aria-label, placeholder, name, id
            let semantic = await field.getAttribute('aria-label');
            if (!semantic) semantic = await field.getAttribute('placeholder');
            if (!semantic) {
                semantic = await field.evaluate(el => {
                    // Try to find label text
                    if (el.id) {
                        const lbl = el.ownerDocument.querySelector(`label[for='${el.id}']`);
                        if (lbl) return lbl.textContent.trim();
                    }
                    // Try parent label
                    let parent = el.parentElement;
                    while (parent) {
                        if (parent.tagName.toLowerCase() === 'label') return parent.textContent.trim();
                        parent = parent.parentElement;
                    }
                    // Try aria-labelledby
                    if (el.getAttribute('aria-labelledby')) {
                        const ids = el.getAttribute('aria-labelledby').split(' ');
                        let labelText = '';
                        ids.forEach(id => {
                            const lbl = el.ownerDocument.getElementById(id);
                            if (lbl) labelText += lbl.textContent.trim() + ' ';
                        });
                        if (labelText) return labelText.trim();
                    }
                    return null;
                });
            }
            if (!semantic) semantic = await field.getAttribute('name');
            if (!semantic) semantic = await field.getAttribute('id');
            // Default value for checkboxes/radios
            let defaultValue = '';
            if (type === 'checkbox') defaultValue = true;
            if (type === 'radio') defaultValue = true;
            result.push({
                name: await field.getAttribute('name'),
                id: await field.getAttribute('id'),
                type,
                semantic,
                element: field,
                default: defaultValue
            });
        }
        return result;
    },
    async fillField(page, field, value) {
        if (!field || !field.element) return;
        // Wait for visibility/enabled and scroll into view
        await field.element.waitForElementState('visible');
        await field.element.waitForElementState('enabled');
        await field.element.evaluate(el => el.scrollIntoView({ block: 'center' }));
        switch (field.type) {
            case 'text':
            case 'email':
            case 'password':
            case 'search':
            case 'tel':
            case 'url':
            case 'textarea':
            case 'contenteditable':
                await field.element.fill(value || '');
                break;
            case 'checkbox':
                if (value === undefined || value === null) value = field.default;
                if (value) await field.element.check();
                else await field.element.uncheck();
                break;
            case 'radio':
                if (value === undefined || value === null) value = field.default;
                if (value) await field.element.check();
                break;
            case 'select':
                // Try value, fallback to first option
                let options = await field.element.$$('option');
                let optionValue = value;
                if (!optionValue && options.length) {
                    optionValue = await options[0].getAttribute('value');
                }
                await field.element.selectOption(optionValue || '');
                break;
            case 'file':
                // Skipping file input for now
                break;
            default:
                await field.element.fill(value || '');
        }
    }
};

module.exports = fieldSelector;
