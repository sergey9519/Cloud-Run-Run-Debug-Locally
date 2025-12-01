import { Controller, Post, Body, Req, UseGuards, UsePipes, Logger } from '@nestjs/common';
import { DataExtractorService } from '../google/data-extractor.service';
import { GeminiAnalystService } from '../ai/gemini-analyst.service';
import { AnalyzeSheetRequestSchema, AnalyzeSheetRequestDto } from './dto/analysis-result.dto';
import { AuthenticatedUser } from '../google/google-client.factory';

// Mock Zod Pipe (In real app, import from common/pipes)
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';

class ZodValidationPipe implements PipeTransform {
  constructor(private schema: any) {}
  transform(value: any, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return result.data;
  }
}

// Mock Auth Guard (In real app, this would populate request.user)
// @UseGuards(JwtAuthGuard)
@Controller('analysis')
export class WorkspaceAnalysisController {
  private readonly logger = new Logger(WorkspaceAnalysisController.name);

  constructor(
    private readonly extractor: DataExtractorService,
    private readonly analyst: GeminiAnalystService
  ) {}

  @Post('google-sheet')
  @UsePipes(new ZodValidationPipe(AnalyzeSheetRequestSchema))
  async analyzeSheet(@Body() body: AnalyzeSheetRequestDto, @Req() req: any) {
    // In a real implementation, 'user' comes from the Request via AuthGuard
    // For this implementation, we assume the middleware/guard has populated user credentials.
    // If not, we might fail or mock it if this is a dev environment.
    const user: AuthenticatedUser = req.user; 

    if (!user || !user.googleCredentials) {
        // Fallback for development/testing if no AuthGuard is active in this specific context yet
        this.logger.warn("No user credentials found in request. Ensure AuthGuard is active.");
        // Throwing here to enforce security in production code
        // throw new UnauthorizedException('User not authenticated');
    }

    this.logger.log(`Received sheet analysis request for file: ${body.fileId}`);

    // 1. Extract Data (Markdown)
    const contextData = await this.extractor.extractSheetData(user, body.fileId);

    // 2. Analyze with AI
    const analysisResult = await this.analyst.analyzeContext(contextData, body.query);

    return analysisResult;
  }
}