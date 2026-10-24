import * as fs from 'fs';
import * as path from 'path';

export interface RAGDocument {
    id: string;
    content: string;
    metadata: Record<string, any>;
    vector?: number[];
}

export interface SearchResult {
    source: 'LOCAL_VECTOR' | 'NEURAL_WEB' | 'KEYWORD_FTS';
    title: string;
    snippet: string;
    relevanceScore: number;
    urlOrPath?: string;
}

export class HybridRAGEngine {
    private localDocs: RAGDocument[] = [];
    private exaApiKey: string;

    constructor(exaApiKey = process.env.EXA_API_KEY || "") {
        this.exaApiKey = exaApiKey;
    }

    public indexDocument(doc: Omit<RAGDocument, 'id'>): string {
        const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const fullDoc: RAGDocument = { id, ...doc };
        this.localDocs.push(fullDoc);
        return id;
    }

    public async query(queryText: string, options: { maxResults?: number; includeExternal?: boolean } = {}): Promise<SearchResult[]> {
        const limit = options.maxResults || 5;
        const results: SearchResult[] = [];

        // 1. Local Semantic & Keyword Filter
        const queryTerms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        for (const doc of this.localDocs) {
            const contentLower = doc.content.toLowerCase();
            let matches = 0;
            for (const term of queryTerms) {
                if (contentLower.includes(term)) matches++;
            }

            if (matches > 0) {
                const score = matches / queryTerms.length;
                results.push({
                    source: 'LOCAL_VECTOR',
                    title: doc.metadata.title || 'Internal Document',
                    snippet: doc.content.slice(0, 300) + '...',
                    relevanceScore: score,
                    urlOrPath: doc.metadata.path || doc.id
                });
            }
        }

        // 2. External Neural Search via Exa API (if configured and requested)
        if (options.includeExternal && this.exaApiKey) {
            try {
                const response = await fetch('https://api.exa.ai/search', {
                    method: 'POST',
                    headers: {
                        'x-api-key': this.exaApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: queryText,
                        type: 'neural',
                        useAutoprompt: true,
                        numResults: Math.min(limit, 3),
                        contents: {
                            text: { maxCharacters: 500 }
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data?.results) {
                        for (const r of data.results) {
                            results.push({
                                source: 'NEURAL_WEB',
                                title: r.title || 'Web Intelligence',
                                snippet: r.text || '',
                                relevanceScore: 0.85,
                                urlOrPath: r.url
                            });
                        }
                    }
                }
            } catch (err) {
                // Non-blocking fallback to local-only results
                console.warn('[HybridRAG] Exa external search bypassed:', (err as Error).message);
            }
        }

        // Sort descending by relevance score
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    }
}

