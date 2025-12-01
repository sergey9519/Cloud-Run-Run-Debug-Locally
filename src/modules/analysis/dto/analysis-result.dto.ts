import { z } from 'zod';

export const DataPointSchema = z.object({
  row_index: z.number().int().optional().default(0),
  column: z.string().optional().default(""),
  value: z.string().or(z.number()).transform(v => String(v)),
  observation: z.string()
});

export const AnalysisResultSchema = z.object({
  summary: z.string(),
  key_insights: z.array(z.string()),
  data_points: z.array(DataPointSchema),
  confidence_score: z.number().min(0).max(1)
});

export type AnalysisResultDto = z.infer<typeof AnalysisResultSchema>;

// Request DTO for the controller
export const AnalyzeSheetRequestSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  query: z.string().min(1, "Analysis query is required")
});

export type AnalyzeSheetRequestDto = z.infer<typeof AnalyzeSheetRequestSchema>;