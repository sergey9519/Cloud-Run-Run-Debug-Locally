/**
 * MODULE: Structured Output Layer
 * 
 * DESCRIPTION:
 * Enforces deterministic data structures from probabilistic LLM outputs.
 * Combines strict Zod schema validation with auto-retry logic to guarantee 
 * that the application receives valid JSON, or throws a descriptive error.
 * 
 * REFERENCES:
 * - Structured Outputs [11]
 * - Zod Schema Validation [12]
 */

import { z } from 'zod';
import { GenAIService } from './GenAIService';
import { withResilience } from './ResilienceLayer';

export class StructuredGenAI {
  
  /**
   * Generates content and validates it against a Zod schema.
   * 
   * @param aiService - Instance of the GenAIService
   * @param prompt - The user prompt
   * @param schema - The Zod schema object defining the expected shape
   * @returns The typed data object conforming to Schema T
   */
  public static async generateStructured<T>(
    aiService: GenAIService, 
    prompt: string, 
    schema: z.ZodType<T>
  ): Promise<T> {
    
    // 1. Augment System Instruction for JSON
    // We explicitly instruct the model to output JSON.
    const systemInstruction = `
      You are a precise data extraction engine. 
      Output ONLY valid JSON matching the user's request. 
      Do not include markdown formatting, preambles, or explanations.
    `;
    
    // 2. Define the operation with validation inside
    // We wrap the *entire* process (Generate -> Parse -> Validate) in the retry logic.
    // This means if the model outputs bad JSON, we retry the generation.
    return await withResilience(async () => {
        
        const rawResponse = await aiService.generateEnhancedContent(
            prompt, 
            'gemini-2.5-flash', 
            systemInstruction
        );

        try {
            // Step A: Clean response (remove potential markdown fences)
            const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
            
            // Step B: Parse JSON
            const parsedObj = JSON.parse(cleanJson);
            
            // Step C: Validate against Zod Schema
            // This throws a ZodError if the shape is wrong
            return schema.parse(parsedObj);

        } catch (error) {
            // We throw a specific error to trigger the retry mechanism
            throw new Error(`Structured Generation Failed: Validation Error. ${error instanceof Error ? error.message : ''}`);
        }
    });
  }
}