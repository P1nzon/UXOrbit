const { AxeBuilder } = require('@axe-core/playwright');

const accessibilityChecker = {
    async check(page) {
        try {
            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();
            const violations = (results.violations || []).map(v => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                help: v.help,
                nodes: v.nodes.map(n => ({
                    target: n.target,
                    html: n.html,
                    failureSummary: n.failureSummary
                }))
            }));
            return {
                passes: results.passes || [],
                violations,
                incomplete: results.incomplete || [],
                inapplicable: results.inapplicable || []
            };
        } catch (err) {
            return {
                passes: [],
                violations: [],
                incomplete: [],
                inapplicable: [],
                error: err.message
            };
        }
    }
};

module.exports = accessibilityChecker;
