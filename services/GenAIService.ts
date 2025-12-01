import { GoogleGenerativeAI } from '@google/generative-ai';

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
    private client: GoogleGenerativeAI;
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
    private initializeClient(config: GenAIConfig): GoogleGenerativeAI {
        // For now, only support Developer API mode
        if (!config.apiKey) {
            throw new Error(
                "Architecture Error: Google GenAI API Key is required. " +
                "Ensure GEMINI_API_KEY is set in the environment."
            );
        }
        console.log(" Initializing in Developer API mode (AI Studio)");
        return new GoogleGenerativeAI(config.apiKey);
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
    public getClient(): GoogleGenerativeAI {
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
            const model = this.client.getGenerativeModel({ model: modelId });

            // Configuration for high-fidelity generation
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7, // Balanced creativity and determinism
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192, // Gemini 2.0 supports larger context windows
                }
            });

            // Robust null checking on the response object
            if (!response || !response.response.text()) {
                throw new Error("GenAI Error: Received empty response payload.");
            }

            return response.response.text();
        } catch (error) {
            // Detailed error logging for observability
            console.error(` Generation failed for model ${modelId}:`, error);
            throw error; // Re-throw to be handled by the Resilience Layer (Part IV)
        }
    }
}