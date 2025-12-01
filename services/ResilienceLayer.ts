/**
 * MODULE: System Resilience Layer
 * 
 * DESCRIPTION:
 * Implements advanced retry logic using Truncated Exponential Backoff with Full Jitter.
 * This module is critical for handling transient failures (network blips) and 
 * systemic backpressure (Rate Limits/429s) in a distributed architecture.
 * 
 * ALGORITHM:
 * Delay = min(Cap, Base * 2^Attempt)
 * Sleep = Random(0, Delay)
 * 
 * REFERENCES:
 * - Exponential Backoff Patterns [7, 26]
 * - Google Cloud Error Handling [8, 22]
 * - Generic Wrapper Design [27, 28]
 */

/** Configuration options for the retry mechanism */
export interface RetryOptions {
    /** Maximum number of retry attempts before giving up */
    maxAttempts: number;
    /** Initial wait time in milliseconds */
    initialDelayMs: number;
    /** Maximum wait time (cap) in milliseconds */
    maxDelayMs: number;
    /** The multiplier for the backoff (usually 2) */
    backoffFactor: number;
    /** Whether to apply random jitter to the delay */
    jitter: boolean;
    /** Predicate function to determine if an error is transient/retryable */
    shouldRetry?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 5,
    initialDelayMs: 1000, // Start with 1 second
    maxDelayMs: 32000,    // Cap at 32 seconds
    backoffFactor: 2,
    jitter: true,
    // Default logic: Retry on network errors and specific HTTP codes
    shouldRetry: (err: any) => {
        // Extract status code from various common error formats (Axios, Google SDK, Fetch)
        const status = err?.status || err?.response?.status || err?.code;
        
        if (!status) return true; // Retry on generic network failures (no status)

        // Retry 429 (Rate Limit), 500 (Server Error), 503 (Unavailable)
        // Do NOT retry 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden)
        return status === 429 || status === 408 || (typeof status === 'number' && status >= 500 && status < 600);
    }
};

/**
 * A generic higher-order function that adds resilience to any Promise-returning operation.
 * 
 * @param operation - The async function to execute
 * @param options - Custom overrides for retry behavior
 */
export async function withResilience<T>(
    operation: () => Promise<T>, 
    options: Partial<RetryOptions> = {}
): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let attempt = 0;

    while (true) {
        try {
            // Attempt the operation
            return await operation();
        } catch (error: any) {
            attempt++;

            // 1. Check Max Attempts
            if (attempt >= config.maxAttempts) {
                console.error(`[Resilience] Max attempts (${config.maxAttempts}) exceeded.`);
                throw new Error(
                    `Operation failed after ${config.maxAttempts} attempts. ` + 
                    `Last Error: ${error instanceof Error ? error.message : String(error)}`
                );
            }

            // 2. Check if Error is Retryable
            if (config.shouldRetry && !config.shouldRetry(error)) {
                console.warn(`[Resilience] Error deemed fatal/non-retryable:`, error);
                throw error; // Fail fast on logical errors (e.g., Invalid API Key)
            }

            // 3. Calculate Delay (Exponential Backoff)
            let delay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt - 1);
            
            // Apply Cap
            if (delay > config.maxDelayMs) {
                delay = config.maxDelayMs;
            }

            // 4. Apply Jitter (Full Jitter Strategy)
            // Instead of waiting exactly 'delay', we wait a random time between 0 and 'delay'
            // This is the most effective strategy for reducing contention.
            if (config.jitter) {
                delay = Math.random() * delay;
            }

            // Round to integer for setTimeout
            const waitTime = Math.round(delay);

            console.warn(
                `[Resilience] Attempt ${attempt} failed (Status: ${extractStatus(error)}). ` +
                `Retrying in ${waitTime}ms...`
            );

            // Wait before next loop iteration
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

/** Helper to safely extract status codes for logging */
function extractStatus(err: any): string {
    return err?.status || err?.response?.status || err?.code || 'Unknown';
}