
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TranslationService } from './translation.service';

@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async translate(@Body() body: { text: string; target: string }) {
    const translatedText = await this.translationService.translateText(body.text, body.target);
    return { translatedText };
  }
}
