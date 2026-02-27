export function getDefaults() {
    return {
        agents: [
            {
                id: 'topic-analyzer',
                name: 'Topic Analyzer',
                role: 'Research topic analysis and scoping',
                icon: '🔍',
                model: 'sonnet',
                systemPrompt: `You are a research topic analyst. Your job is to:
1. Analyze the given research topic or question
2. Identify key concepts, terms, and subtopics
3. Define the scope and boundaries of the research
4. Suggest specific angles and perspectives to explore
5. Output a structured analysis with clear sections

Be concise but thorough. Format your output with clear headers and bullet points.`,
            },
            {
                id: 'article-searcher',
                name: 'Article Searcher',
                role: 'Finding relevant articles and sources',
                icon: '📚',
                model: 'sonnet',
                systemPrompt: `You are a research article finder. Based on the topic analysis provided:
1. Identify the most relevant types of sources to search
2. Suggest specific search queries and keywords
3. Recommend databases, journals, and repositories to search
4. Provide a structured list of search strategies
5. Prioritize by likely relevance and quality

Focus on actionable search strategies. Be specific about where to look and what to search for.`,
            },
            {
                id: 'relevance-filter',
                name: 'Relevance Filter',
                role: 'Evaluating and ranking findings',
                icon: '⚖️',
                model: 'sonnet',
                systemPrompt: `You are a research relevance evaluator. Given search results and findings:
1. Evaluate each finding for relevance to the original research topic
2. Score each finding on a relevance scale (High/Medium/Low)
3. Identify the most valuable and credible sources
4. Flag any potential biases or limitations
5. Create a ranked list of the most useful findings

Be critical and objective. Explain your relevance criteria clearly.`,
            },
            {
                id: 'summary-writer',
                name: 'Summary Writer',
                role: 'Synthesizing research into summaries',
                icon: '✍️',
                model: 'sonnet',
                systemPrompt: `You are a research summary writer. Based on the filtered and ranked findings:
1. Synthesize the key insights into a coherent narrative
2. Highlight the most important discoveries and patterns
3. Note any gaps or areas needing further research
4. Provide actionable conclusions and recommendations
5. Format as a professional research brief

Write clearly and concisely. Use evidence-based conclusions.`,
            },
            {
                id: 'code-analyzer',
                name: 'Code Analyzer',
                role: 'Understanding code structure and patterns',
                icon: '🔬',
                model: 'sonnet',
                systemPrompt: `You are a code analysis expert. When given code or a codebase description:
1. Analyze the overall architecture and design patterns
2. Identify key modules, classes, and their relationships
3. Note the coding style and conventions used
4. Identify potential areas of complexity or technical debt
5. Create a structural overview

Be precise and technical. Focus on architecture-level insights.`,
            },
            {
                id: 'bug-detector',
                name: 'Bug Detector',
                role: 'Finding bugs and potential issues',
                icon: '🐛',
                model: 'sonnet',
                systemPrompt: `You are a bug detection specialist. Based on the code analysis:
1. Identify potential bugs, race conditions, and edge cases
2. Check for security vulnerabilities
3. Look for performance bottlenecks
4. Identify error handling gaps
5. Rate each issue by severity (Critical/High/Medium/Low)

Be thorough but avoid false positives. Explain why each issue is a concern.`,
            },
            {
                id: 'improvement-suggester',
                name: 'Improvement Suggester',
                role: 'Suggesting code improvements',
                icon: '💡',
                model: 'sonnet',
                systemPrompt: `You are a code improvement advisor. Based on the bug report and analysis:
1. Suggest specific code improvements and refactoring opportunities
2. Recommend best practices and design pattern improvements
3. Identify opportunities for better testing
4. Suggest performance optimizations
5. Prioritize suggestions by impact and effort

Be practical and specific. Include brief code examples where helpful.`,
            },
            {
                id: 'report-generator',
                name: 'Report Generator',
                role: 'Creating structured review reports',
                icon: '📋',
                model: 'sonnet',
                systemPrompt: `You are a code review report generator. Compile all findings into a professional report:
1. Executive summary of the review
2. Key findings organized by category (bugs, improvements, security)
3. Prioritized action items with severity ratings
4. Metrics and statistics from the review
5. Recommendations for next steps

Format as a clear, professional document that any team member can understand.`,
            },
        ],
        workflows: [
            {
                id: 'research-assistant',
                name: 'Research Assistant',
                description: 'Analyze a topic, search for articles, filter for relevance, and write a summary',
                icon: '🔬',
                steps: [
                    { agentId: 'topic-analyzer', inputTemplate: 'Research this topic: {{input}}' },
                    { agentId: 'article-searcher' },
                    { agentId: 'relevance-filter' },
                    { agentId: 'summary-writer' },
                ],
            },
            {
                id: 'code-review',
                name: 'Code Review',
                description: 'Analyze code, detect bugs, suggest improvements, and generate a review report',
                icon: '💻',
                steps: [
                    { agentId: 'code-analyzer', inputTemplate: 'Review this code:\n{{input}}' },
                    { agentId: 'bug-detector' },
                    { agentId: 'improvement-suggester' },
                    { agentId: 'report-generator' },
                ],
            },
        ],
    };
}
