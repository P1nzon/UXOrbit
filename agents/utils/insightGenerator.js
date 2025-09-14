const insightGenerator = {
    async generate(domResults, accessibilityResults, perfResults, screenshotResults) {
        // Aggregate and score
        const issues = [];
        const recommendations = [];
        function weight(severity) {
            if (severity === 'critical' || severity === 'high') return 10;
            if (severity === 'medium' || severity === 'serious') return 5;
            if (severity === 'low' || severity === 'minor') return 2;
            return 1;
        }
        if (!domResults.htmlValid) {
            issues.push({ type: 'structure', severity: 'critical', message: 'Invalid HTML structure.' });
            recommendations.push('Fix invalid HTML structure.');
        }
        if (domResults.issues && domResults.issues.length) {
            domResults.issues.forEach(issue => {
                issues.push(issue);
                if (issue.type === 'heading') recommendations.push('Correct heading hierarchy for better accessibility.');
                if (issue.type === 'form') recommendations.push('Add labels to all form inputs.');
                if (issue.type === 'image') recommendations.push('Add descriptive alt text to all images.');
            });
        }
        if (accessibilityResults.violations && accessibilityResults.violations.length) {
            accessibilityResults.violations.forEach(v => {
                issues.push({ type: 'accessibility', severity: v.impact, message: v.description, help: v.help, nodes: v.nodes });
                recommendations.push(`Accessibility: ${v.help}`);
            });
        }
        // Weighting
        let score = 100;
        issues.forEach(issue => {
            score -= weight(issue.severity);
        });
        score = Math.max(0, Math.min(100, score));
        return {
            summary: `Usability score: ${score}/100. Found ${issues.length} issues.`,
            issues,
            recommendations,
            dom: domResults,
            accessibility: accessibilityResults,
            performance: perfResults,
            screenshots: screenshotResults
        };
    }
};

module.exports = insightGenerator;
