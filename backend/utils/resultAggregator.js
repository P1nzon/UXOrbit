const logger = require('./logger');

function calculateDetailedScores(summary) {
    let scores = { usability: 0, accessibility: 0, performance: 0 };
    let counts = { usability: 0, accessibility: 0, performance: 0 };
    let accessibilityCompliance = 0;
    let accessibilityTotal = 0;
    let wcagCounts = {};
    let performanceMetrics = [];
    let criticalIssues = [];
    summary.forEach(r => {
        if (r.results && r.results.usabilityReport) {
            const report = r.results.usabilityReport;
            if (typeof report.summary === 'string') {
                const match = report.summary.match(/(\d+)\/100/);
                if (match) {
                    scores.usability += parseInt(match[1]);
                    counts.usability++;
                }
            }
            if (Array.isArray(report.issues)) {
                report.issues.forEach(issue => {
                    if (issue.severity === 'critical') criticalIssues.push(issue);
                });
            }
        }
        if (r.results && r.results.accessibility) {
            const acc = r.results.accessibility;
            if (typeof acc.compliance === 'number') {
                accessibilityCompliance += acc.compliance;
                accessibilityTotal++;
            }
            if (Array.isArray(acc.wcag)) {
                acc.wcag.forEach(rule => {
                    wcagCounts[rule] = (wcagCounts[rule] || 0) + 1;
                });
            }
        }
        if (r.results && r.results.performance) {
            performanceMetrics.push(r.results.performance);
            if (typeof r.results.performance.score === 'number') {
                scores.performance += r.results.performance.score;
                counts.performance++;
            }
        }
    });
    // Aggregate performance metrics
    function aggregatePerfMetric(metric) {
        const values = performanceMetrics.map(pm => pm[metric]).filter(v => typeof v === 'number');
        if (!values.length) return { avg: null, min: null, max: null };
        return {
            avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }
    return {
        usabilityScore: counts.usability ? Math.round(scores.usability / counts.usability) : null,
        accessibilityCompliance: accessibilityTotal ? Math.round(accessibilityCompliance / accessibilityTotal) : null,
        wcagCounts,
        performanceScore: counts.performance ? Math.round(scores.performance / counts.performance) : null,
        performance: {
            fcp: aggregatePerfMetric('fcp'),
            lcp: aggregatePerfMetric('lcp'),
            tti: aggregatePerfMetric('tti'),
            raw: performanceMetrics
        },
        criticalIssues,
    };
}

function identifyPatterns(summary) {
    // Example: find common issues across agents
    const issueMap = {};
    summary.forEach(r => {
        if (r.results && r.results.usabilityReport && Array.isArray(r.results.usabilityReport.issues)) {
            r.results.usabilityReport.issues.forEach(issue => {
                const key = issue.type + ':' + issue.message;
                issueMap[key] = (issueMap[key] || 0) + 1;
            });
        }
    });
    return Object.entries(issueMap).filter(([_, count]) => count > 1).map(([key]) => key);
}

function generateRecommendations(summary) {
    // Aggregate recommendations from all agents
    const recs = [];
    summary.forEach(r => {
        if (r.results && r.results.usabilityReport && Array.isArray(r.results.usabilityReport.recommendations)) {
            recs.push(...r.results.usabilityReport.recommendations);
        }
    });
    // Prioritize unique recommendations
    return Array.from(new Set(recs));
}

function createMetricsSummary(scores) {
    return {
        usability: scores.usabilityScore,
        accessibility: scores.accessibilityCompliance,
        performance: scores.performanceScore,
    };
}

const BENCHMARKS = {
  usability: { good: 80, needsImprovement: 60 },
  accessibility: { good: 90, needsImprovement: 70 },
  performance: { good: 80, needsImprovement: 60 }
};

function classifyScore(type, value) {
  if (value >= BENCHMARKS[type].good) return 'Good';
  if (value >= BENCHMARKS[type].needsImprovement) return 'Needs Improvement';
  return 'Poor';
}

const resultAggregator = {
    aggregate(agentResults, options = {}) {
        // Merge results, preserve agent data
        const summary = agentResults.map((r, i) => ({
            agentType: r.agentType || `agent${i}`,
            runId: r.runId,
            error: r.error || null,
            ...r
        }));
        // Enhanced scoring and analysis
        const scores = calculateDetailedScores(summary);
        const patterns = identifyPatterns(summary);
        const recommendations = generateRecommendations(summary);
        const metricsSummary = createMetricsSummary(scores);
        // Executive summary
        const executiveSummary = `Overall usability score: ${scores.usabilityScore || 'N/A'} (${summary.length} agents). Accessibility: ${scores.accessibilityCompliance || 'N/A'}%. Performance: ${scores.performanceScore || 'N/A'}`;
        // Accessibility summary
        const accessibilitySummary = {
            compliance: scores.accessibilityCompliance,
            wcagCounts: scores.wcagCounts,
            benchmark: classifyScore('accessibility', scores.accessibilityCompliance)
        };
        // Performance summary
        const performanceSummary = {
            ...scores.performance,
            benchmark: classifyScore('performance', scores.performanceScore)
        };
        // Usability summary
        const usabilitySummary = {
            score: scores.usabilityScore,
            benchmark: classifyScore('usability', scores.usabilityScore)
        };
        // Agent failures
        const agentFailures = summary.filter(a => a.error);

        // Historical comparison (if provided)
        let trend = null;
        if (options.previousResults) {
            const prev = options.previousResults.scores || {};
            trend = {
                usability: scores.usabilityScore - (prev.usabilityScore || 0),
                accessibility: scores.accessibilityCompliance - (prev.accessibilityCompliance || 0),
                performance: scores.performanceScore - (prev.performanceScore || 0)
            };
        }

        // Weights (if provided)
        let weightedScore = null;
        if (options.weights) {
            weightedScore = (
                (scores.usabilityScore * (options.weights.usability || 1)) +
                (scores.accessibilityCompliance * (options.weights.accessibility || 1)) +
                (scores.performanceScore * (options.weights.performance || 1))
            ) / (
                (options.weights.usability || 1) +
                (options.weights.accessibility || 1) +
                (options.weights.performance || 1)
            );
        }

        return {
            executiveSummary,
            agents: summary,
            scores,
            patterns,
            recommendations,
            metricsSummary,
            accessibilitySummary,
            performanceSummary,
            usabilitySummary,
            agentFailures,
            trend,
            weightedScore,
        };
    }
};

module.exports = resultAggregator;
