import { GoogleGenAI } from '@google/genai';

// Detailed configuration interface ensuring strict typing
export interface GenAIConfig {
    /** API Key for Google AI Studio (Developer Tier) */
    apiKey?: string;
    /** Google Cloud Project ID (Vertex AI Tier) */
    projectId?: string;
    /** Google Cloud Region (Vertex AI Tier) */
    location?: string;
    /** Flag to force usage of Vertex AI backend */
    useVertex?: boolean;
    /** Optional API version override (e.g., 'v1beta') */
    apiVersion?: string;
}

export class GenAIService {
    private client: GoogleGenAI;
    private static instance: GenAIService;
    private config: GenAIConfig;

    /**
     * Private constructor enforces the Singleton pattern.
     * Validates configuration immediately upon instantiation to fail fast.
     */
    private constructor(config: GenAIConfig) {
        this.config = config;
        this.client = this.initializeClient(config);
    }

    /**
     * Initializes the underlying GoogleGenAI client based on the provided configuration.
     * Handles the bifurcation between Vertex AI and Developer API logic.
     * 
     * @param config - The configuration object
     * @returns An initialized GoogleGenAI instance
     */
    private initializeClient(config: GenAIConfig): GoogleGenAI {
        if (config.useVertex) {
            // Vertex AI requires specific environment variables or config
            // Reference:  - Vertex AI Initialization
            if (!config.projectId || !config.location) {
                throw new Error(
                    "Architecture Error: Vertex AI requires 'projectId' and 'location'. " +
                    "Ensure GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are set."
                );
            }
            console.log(` Initializing in Vertex AI mode (Project: ${config.projectId}, Location: ${config.location})`);
            // FIX: Using flattened config with vertexai boolean
            return new GoogleGenAI({
                vertexai: true,
                project: config.projectId,
                location: config.location,
            });
        } else {
            // Fallback to standard Developer API
            // Reference:  - API Key Security
            if (!config.apiKey) {
                throw new Error(
                    "Architecture Error: Google GenAI API Key is required for Developer API usage. " +
                    "Ensure GEMINI_API_KEY is set in the environment."
                );
            }
            console.log(" Initializing in Developer API mode (AI Studio)");
            return new GoogleGenAI({ apiKey: config.apiKey });
        }
    }

    /**
     * Global accessor for the service instance.
     * Implements lazy loading.
     */
    public static getInstance(config: GenAIConfig): GenAIService {
        if (!GenAIService.instance) {
            GenAIService.instance = new GenAIService(config);
        }
        return GenAIService.instance;
    }

    /**
     * Direct accessor to the underlying client for advanced usage.
     * Useful for accessing sub-modules like files, chats, and tuning.
     */
    public getClient(): GoogleGenAI {
        return this.client;
    }

    /**
     * Enhanced generation method supporting Gemini 2.0 features.
     * This method is "additive" and does not replace existing generation calls.
     * 
     * @param prompt - The input text prompt
     * @param modelId - The model version (defaults to gemini-2.5-flash)
     * @param systemInstruction - Optional system prompt for context setting
     */
    public async generateEnhancedContent(
        prompt: string, 
        modelId: string = 'gemini-2.5-flash',
        systemInstruction?: string
    ): Promise<string> {
        try {
            const model = this.client.models;
            
            // Configuration for high-fidelity generation
            // Reference: [16] - Generation Config
            const response = await model.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7, // Balanced creativity and determinism
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192, // Gemini 2.0 supports larger context windows
                }
            });

            // Robust null checking on the response object
            if (!response || !response.text) {
                throw new Error("GenAI Error: Received empty response payload.");
            }

            return response.text;
        } catch (error) {
            // Detailed error logging for observability
            // Reference: [17] - Troubleshooting API errors
            console.error(` Generation failed for model ${modelId}:`, error);
            throw error; // Re-throw to be handled by the Resilience Layer (Part IV)
        }
    }
}