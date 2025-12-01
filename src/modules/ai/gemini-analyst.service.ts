import { Injectable, Logger, InternalServerErrorException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

/**
 * Data point extracted from the analysis
 */
export interface DataPoint {
  /** The Excel row number (1-based) if applicable, or 0 */
  row_index: number;
  /** The column name or data label */
  column: string;
  /** The specific value found */
  value: string;
  /** Why this point is relevant */
  observation: string;
}

/**
 * Structured analysis result from AI processing
 */
export interface AnalysisResult {
  /** A concise summary of the analysis */
  summary: string;
  /** 3-5 key takeaways from the data */
  key_insights: string[];
  /** Specific evidence used to support the insights */
  data_points: DataPoint[];
  /** Confidence level between 0 and 1 */
  confidence_score: number;
}

/**
 * Custom exception for AI processing errors
 */
export class AIProcessingException extends HttpException {
  constructor(message: string, details?: any) {
    super({ message, error: 'AI_PROCESSING_ERROR', details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

/**
 * Service for performing AI-powered data analysis using Google's Gemini models
 * Provides structured analysis of contextual data with confidence scoring
 */
@Injectable()
export class GeminiAnalystService {
  private readonly logger = new Logger(GeminiAnalystService.name);
  private readonly ai: GoogleGenerativeAI;

  private readonly config = {
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2'),
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
  };

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or API_KEY environment variable must be set');
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Executes an operation with retry logic and exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === this.config.maxRetries) break;

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`, {
          attempt,
          delay,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Executes an operation with a timeout
   */
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${this.config.timeoutMs}ms`)), this.config.timeoutMs)
      )
    ]);
  }

  /**
   * Analyzes contextual data using AI to provide structured insights
   * @param contextData The raw data context to analyze
   * @param userQuery The specific question or analysis request
   * @param mimeType The MIME type of the context data (affects processing)
   * @returns Structured analysis result with summary, insights, and evidence
   */
  async analyzeContext(
    contextData: string,
    userQuery: string,
    mimeType: 'text/csv' | 'text/plain' = 'text/plain'
  ): Promise<AnalysisResult> {
    // Input validation
    if (!contextData?.trim()) {
      throw new BadRequestException('Context data is required');
    }
    if (!userQuery?.trim()) {
      throw new BadRequestException('User query is required');
    }

    // Sanitize inputs
    const sanitizedContext = contextData.trim();
    const sanitizedQuery = userQuery.trim();

    const startTime = Date.now();
    const model = this.config.model;

    // Output Schema Definition
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: "A concise summary of the analysis." },
        key_insights: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "3-5 key takeaways from the data."
        },
        data_points: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    row_index: { type: SchemaType.INTEGER, description: "The Excel row number (1-based) if applicable, or 0." },
                    column: { type: SchemaType.STRING, description: "The column name or data label." },
                    value: { type: SchemaType.STRING, description: "The specific value found." },
                    observation: { type: SchemaType.STRING, description: "Why this point is relevant." }
                }
            },
            description: "Specific evidence used to support the insights."
        },
        confidence_score: { type: SchemaType.NUMBER, description: "Confidence level between 0 and 1." }
      },
      required: ["summary", "key_insights", "data_points", "confidence_score"]
    };

    const prompt = `
    You are a Senior Data Analyst with 15+ years of experience in business intelligence and data-driven decision making.

    ANALYTICAL APPROACH:
    1. First, understand the data structure and content type (${mimeType})
    2. Identify key patterns, trends, and anomalies in the data
    3. Extract relevant data points that directly address the query
    4. Provide actionable insights with business context
    5. Assess confidence based on data quality and relevance

    QUALITY STANDARDS:
    - Be precise and data-driven in your analysis
    - Focus on insights that can drive business decisions
    - Include specific evidence from the data
    - Be honest about limitations and uncertainties
    - Provide confidence scores based on data completeness

    STRICT FORMATTING RULES:
    1. You must return valid JSON matching the provided schema exactly.
    2. Do not include any markdown formatting, code blocks, or extra text.
    3. If the data is insufficient to answer the query, clearly state this in the summary and set confidence_score below 0.5.
    4. Ensure all data_points have valid observations explaining their relevance.

    USER QUERY: "${sanitizedQuery}"

    --- DATA CONTEXT START ---
    ${sanitizedContext}
    --- DATA CONTEXT END ---

    Remember: Your analysis should be comprehensive yet concise, focusing on what matters most for the business question.
    `;

    try {
      this.logger.log(`Starting analysis`, {
        model,
        queryLength: sanitizedQuery.length,
        contextLength: sanitizedContext.length,
        mimeType
      });

      const generativeModel = this.ai.getGenerativeModel({ model });

      const response = await this.withRetry(() =>
        this.withTimeout(
          generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: responseSchema,
              temperature: this.config.temperature,
            }
          })
        )
      );

      const text = response.response.text();
      if (!text?.trim()) {
        throw new Error("Empty response from AI");
      }

      const duration = Date.now() - startTime;
      this.logger.log(`AI response received`, { duration, responseLength: text.length });

      try {
        const result = JSON.parse(text.trim()) as AnalysisResult;
        this.logger.log(`Analysis completed successfully`, {
          duration,
          confidence: result.confidence_score,
          dataPoints: result.data_points.length
        });
        return result;
      } catch (parseError) {
        this.logger.error("Malformed JSON from AI", { text, parseError: parseError.message });
        // Simple repair attempt: remove markdown fences if they slipped through
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        try {
          const result = JSON.parse(cleaned) as AnalysisResult;
          this.logger.warn("JSON repaired by removing markdown fences");
          return result;
        } catch (e) {
          throw new AIProcessingException("Failed to parse AI response. The model returned malformed JSON.", {
            raw_response: text,
            parse_error: e.message
          });
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      if (error instanceof AIProcessingException) {
        this.logger.error(`AI Processing Exception`, {
          duration,
          message: error.message,
          details: error.getResponse()
        });
        throw error;
      }
      this.logger.error(`Gemini Analysis Failed`, {
        duration,
        error: error.message,
        stack: error.stack
      });
      throw new InternalServerErrorException("AI Analysis Service currently unavailable.");
    }
  }
}