import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AIAnalystService {
  private readonly logger = new Logger(AIAnalystService.name);

  /**
   * Sends the Markdown-formatted sheet context to Gemini 2.5 Flash for analysis.
   * Returns a JSON object based on the user's query.
   */
  async analyzeSheet(sheetContext: string, userQuery: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-2.5-flash for optimal balance of speed, cost, and context window size (1M tokens).
    const model = 'gemini-2.5-flash';

    const prompt = `
    You are an expert Data Analyst AI for a creative agency. 
    Your task is to analyze the provided dataset (formatted as a Markdown Table) and answer the User's Query.
    
    DATASET CONTEXT:
    ${sheetContext}
    
    USER QUERY:
    "${userQuery}"
    
    INSTRUCTIONS:
    1. Analyze the columns to understand the data schema (e.g. Roles, Dates, Names, Statuses).
    2. Perform the requested analysis (filtering, counting, finding patterns).
    3. Return the result as valid JSON. 
    4. Do NOT output markdown formatting (like \`\`\`json). Just the raw JSON object.
    
    Example Output Structure:
    {
      "summary": "Brief text summary of findings",
      "results": [ ...array of relevant rows/items... ],
      "meta": { "total_matches": 5 }
    }
    `;

    try {
      this.logger.debug(`Sending analysis request to ${model}`);
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          // Temperature 0.2 for analytical precision vs creativity
          temperature: 0.2, 
        }
      });

      const text = response.text;
      
      if (!text) {
        throw new Error('Model returned empty response');
      }

      return JSON.parse(text);

    } catch (error: any) {
      this.logger.error(`AI Analysis failed: ${error}`);
      throw new Error(`Failed to analyze data: ${error.message}`);
    }
  }
}