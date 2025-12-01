/**
 * MODULE: Semantic Vector Engine (VectorMath)
 * 
 * DESCRIPTION:
 * Provides high-precision linear algebra primitives for semantic search operations.
 * This module enables the application to perform in-memory re-ranking and similarity 
 * comparisons of text embeddings without external dependencies.
 * 
 * MATHEMATICAL FOUNDATION:
 * Implements Cosine Similarity, which measures the cosine of the angle between 
 * two non-zero vectors in an inner product space. This is preferred over Euclidean 
 * distance for text embeddings as it normalizes for document length (magnitude).
 * 
 * REFERENCES:
 * - Cosine Similarity Theory 
 * - Vector Database Concepts [21]
 */

export class VectorMath {

    /**
     * Calculates the Dot Product of two vectors.
     * The sum of the products of corresponding entries.
     * Formula: A. B = Σ(Ai * Bi)
     */
    private static dotProduct(vecA: number[], vecB: number[]): number {
        let product = 0;
        for (let i = 0; i < vecA.length; i++) {
            product += vecA[i] * vecB[i];
        }
        return product;
    }

    /**
     * Calculates the Magnitude (Euclidean Norm) of a vector.
     * Formula: ||A|| = √Σ(Ai^2)
     */
    private static magnitude(vec: number[]): number {
        let sum = 0;
        for (let i = 0; i < vec.length; i++) {
            sum += vec[i] * vec[i];
        }
        return Math.sqrt(sum);
    }

    /**
     * Computes Cosine Similarity between two vectors.
     * 
     * @param vecA - The first embedding vector (e.g., query)
     * @param vecB - The second embedding vector (e.g., document)
     * @returns A score between -1.0 (opposite) and 1.0 (identical)
     * @throws Error if vector dimensions do not match
     */
    public static cosineSimilarity(vecA: number[], vecB: number[]): number {
        // 1. Structural Validation
        // Embeddings must share the same dimensionality (e.g., both 768)
        if (vecA.length !== vecB.length) {
            throw new Error(
                `Vector Math Error: Dimension mismatch. ` +
                `VecA: ${vecA.length}, VecB: ${vecB.length}. Comparison impossible.`
            );
        }

        // 2. Compute Components
        const dot = this.dotProduct(vecA, vecB);
        const magA = this.magnitude(vecA);
        const magB = this.magnitude(vecB);

        // 3. Safety Check
        // Prevent Division by Zero if a vector is empty or zeroed out
        if (magA === 0 || magB === 0) {
            console.warn("[VectorMath] Warning: Zero magnitude vector encountered. Returning 0 similarity.");
            return 0;
        }

        // 4. Final Calculation
        return dot / (magA * magB);
    }

    /**
     * Utility: Nearest Neighbor Search.
     * Performs a linear scan to find the most relevant documents for a query.
     * This is an O(N) operation suitable for re-ranking small result sets (N < 10,000).
     * 
     * @param queryVec - The query embedding
     * @param corpus - Array of items containing embeddings
     * @param k - Number of top results to return
     */
    public static findNearestNeighbors<T extends { id: string; embedding: number[] }>(
        queryVec: number[], 
        corpus: T[], 
        k: number = 3
    ): Array<{ item: T; score: number }> {
        return corpus
           .map(item => ({
                item: item,
                score: this.cosineSimilarity(queryVec, item.embedding)
            }))
           .sort((a, b) => b.score - a.score) // Sort descending by score
           .slice(0, k); // Take top K
    }
}