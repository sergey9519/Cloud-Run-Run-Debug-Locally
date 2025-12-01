import { Injectable, Logger, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';

export class AIProcessingException extends HttpException {
  constructor(message: string, details?: any) {
    super({ message, error: 'AI_PROCESSING_ERROR', details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

@Injectable()
export class GeminiAnalystService {
  private readonly logger = new Logger(GeminiAnalystService.name);
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeContext(
    contextData: string, 
    userQuery: string, 
    mimeType: 'text/csv' | 'text/plain' = 'text/plain'
  ): Promise<any> {
    // Use gemini-2.5-flash for optimal balance of speed, cost, and context window size.
    const model = 'gemini-2.5-flash';

    // Output Schema Definition
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A concise summary of the analysis." },
        key_insights: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3-5 key takeaways from the data." 
        },
        data_points: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    row_index: { type: Type.INTEGER, description: "The Excel row number (1-based) if applicable, or 0." },
                    column: { type: Type.STRING, description: "The column name or data label." },
                    value: { type: Type.STRING, description: "The specific value found." },
                    observation: { type: Type.STRING, description: "Why this point is relevant." }
                }
            },
            description: "Specific evidence used to support the insights."
        },
        confidence_score: { type: Type.NUMBER, description: "Confidence level between 0 and 1." }
      },
      required: ["summary", "key_insights", "data_points", "confidence_score"]
    };

    const prompt = `
    You are a Senior Data Analyst. 
    Analyze the following data context and answer the user's query.
    
    STRICT FORMATTING RULES:
    1. You must return valid JSON matching the provided schema.
    2. Do not include markdown formatting like \`\`\`json.
    3. If the data is insufficient to answer the query, state that in the summary and set confidence_score to low.

    USER QUERY: "${userQuery}"

    --- DATA CONTEXT START ---
    ${contextData}
    --- DATA CONTEXT END ---
    `;

    try {
      this.logger.log(`Analyzing context with ${model}. Query: ${userQuery}`);

      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2, // Low temperature for analytical rigor
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");

      try {
          return JSON.parse(text);
      } catch (parseError) {
          this.logger.error("Malformed JSON from AI", text);
          // Simple repair attempt: remove markdown fences if they slipped through
          const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
             return JSON.parse(cleaned);
          } catch (e) {
             throw new AIProcessingException("Failed to parse AI response. The model returned malformed JSON.", { raw_response: text });
          }
      }

    } catch (error) {
      if (error instanceof AIProcessingException) {
        throw error;
      }
      this.logger.error(`Gemini Analysis Failed: ${error.message}`);
      throw new InternalServerErrorException("AI Analysis Service currently unavailable.");
    }
  }
}