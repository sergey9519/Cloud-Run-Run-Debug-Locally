/**
 * MODULE: Cognitive Verification Engine (CoVe)
 * 
 * DESCRIPTION:
 * Implements the Chain of Verification (CoVe) pattern to systematically detect 
 * and reduce hallucinations in LLM outputs. This pipeline trades latency and 
 * cost (3x-4x tokens) for significantly higher factual accuracy.
 * 
 * PROCESS FLOW:
 * 1. Draft -> 2. Plan -> 3. Verify -> 4. Revise
 * 
 * REFERENCES:
 * - CoVe Research Paper 
 * - Prompt Engineering Techniques [30]
 */

import { GenAIService } from './GenAIService';
import { withResilience } from './ResilienceLayer';

export class VerificationEngine {
    private aiService: GenAIService;

    constructor(aiService: GenAIService) {
        this.aiService = aiService;
    }

    /**
     * Executes the Chain of Verification pipeline.
     * 
     * @param query - The user's original question
     * @returns The verified, refined response
     */
    public async generateVerifiedContent(query: string): Promise<string> {
        
        // PHASE 1: Baseline Generation
        // We generate the initial "draft" answer.
        console.log("[CoVe] Phase 1: Generating Baseline...");
        const baseline = await withResilience(() => 
            this.aiService.generateEnhancedContent(
                `Answer the following question in detail:\nQuestion: ${query}`
            )
        );

        // PHASE 2: Verification Planning
        // We ask the model to identify factual claims and form questions.
        console.log("[CoVe] Phase 2: Planning Verifications...");
        const planPrompt = `
            Context: ${baseline}
            
            Task: Identify 3-5 distinct factual claims in the text above that could be incorrect. 
            Generate verification questions to check these claims.
            
            Output strictly a JSON list of strings, e.g.:
            ["What represents the X in Y?", "Is Z a valid parameter?"]
        `;
        
        const planRaw = await withResilience(() => 
            this.aiService.generateEnhancedContent(planPrompt, 'gemini-2.5-flash', "You are a skeptical fact-checker.")
        );
        
        const verificationQuestions = this.safeJsonParseList(planRaw);

        if (verificationQuestions.length === 0) {
            console.log("[CoVe] No verification questions generated. Returning baseline.");
            return baseline;
        }

        // PHASE 3: Verification Execution (Factored)
        // We answer each question independently. This is the "Factored" variant of CoVe,
        // which prevents the model from hallucinating consistently with the baseline.
        console.log(`[CoVe] Phase 3: Executing ${verificationQuestions.length} Verifications...`);
        const verificationResults: Array<{ q: string; a: string }> = [];

        // Parallel execution for performance optimization
        await Promise.all(verificationQuestions.map(async (q) => {
            const answer = await withResilience(() => 
                this.aiService.generateEnhancedContent(
                    `Answer this question concisely and accurately based on general knowledge.\nQuestion: ${q}`
                )
            );
            verificationResults.push({ q, a: answer });
        }));

        // PHASE 4: Final Refinement
        // We present the baseline + verification evidence and ask for a rewrite.
        console.log("[CoVe] Phase 4: Final Refinement...");
        const finalPrompt = `
            Original Question: ${query}
            
            Draft Answer: ${baseline}
            
            Verification Findings:
            ${verificationResults.map(v => `Q: ${v.q}\nA: ${v.a}`).join('\n')}
            
            Task: Rewrite the Draft Answer to be fully accurate based ONLY on the Verification Findings. 
            - If the Draft had errors, correct them.
            - If the Draft was correct, refine the clarity.
            - Do not mention "Verification Findings" in the final output.
        `;

        return await withResilience(() => 
            this.aiService.generateEnhancedContent(finalPrompt)
        );
    }

    /**
     * Utility: Robust JSON Parsing.
     * Handles Markdown code blocks (```json) often included by LLMs.
     */
    private safeJsonParseList(input: string): string[] {
        try {
            // Strip markdown formatting
            const clean = input.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn("[CoVe] Failed to parse verification plan JSON. Continuing without verification.", e);
            return [];
        }
    }
}