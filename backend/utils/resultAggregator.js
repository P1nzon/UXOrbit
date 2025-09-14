const logger = require('./logger');

const resultAggregator = {
    aggregate(agentResults) {
        // Merge results, preserve agent data
        const summary = agentResults.map((r, i) => ({
            agentType: r.agentType || `agent${i}`,
            runId: r.runId,
            ...r
        }));
        // Example: calculate overall score
        let score = 0;
        let total = 0;
        summary.forEach(r => {
            if (r.results && r.results.usabilityReport && typeof r.results.usabilityReport.summary === 'string') {
                const match = r.results.usabilityReport.summary.match(/(\d+)\/100/);
                if (match) {
                    score += parseInt(match[1]);
                    total++;
                }
            }
        });
        const overallScore = total ? Math.round(score / total) : null;
        // Executive summary
        const executiveSummary = `Overall usability score: ${overallScore || 'N/A'} (${total} agents).`;
        return {
            executiveSummary,
            agents: summary,
            overallScore
        };
    }
};

module.exports = resultAggregator;
