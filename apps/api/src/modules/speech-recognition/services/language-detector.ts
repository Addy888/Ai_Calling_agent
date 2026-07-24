import { Injectable, Logger } from '@nestjs/common';

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  isHinglish?: boolean;
}

@Injectable()
export class LanguageDetector {
  private readonly logger = new Logger(LanguageDetector.name);

  // Hindi Unicode block ranges
  private readonly HINDI_DEVANAGARI_REGEX = /[\u0900-\u097F]/;

  // Common Hinglish English words (Roman Hindi patterns)
  private readonly HINGLISH_PATTERNS = [
    /\b(haan|nahi|kya|acha|theek|hai|nahin|abhi|karo|raho|lena|dena|ho|bol|sun|yaar|bhai|bolo|suno|matlab|lekin|aur|se|ke|ka|ki|ko|par|mein|tha|the|thi|hu|hoo|hain|waala|wali|wale)\b/i,
    /\b(kaise|kyun|kab|kahan|kitna|kitne|kitni|kaun|konsa|konsi)\b/i,
  ];

  // English-only confirmation (very common English words that appear frequently if pure English)
  private readonly ENGLISH_STRONG_WORDS = [
    /\b(the|a|an|is|are|was|were|have|has|had|will|would|could|should|may|might|do|does|did)\b/i,
  ];

  /**
   * Detect language from a transcript text string
   */
  detect(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return { language: 'en', confidence: 0.5 };
    }

    const hasHindi = this.HINDI_DEVANAGARI_REGEX.test(text);
    const hinglishScore = this.scoreHinglish(text);
    const englishScore = this.scoreEnglish(text);

    if (hasHindi && hinglishScore > 0) {
      // Mixed script with Hindi markers → Hinglish
      return { language: 'hi', confidence: 0.9, isHinglish: true };
    }

    if (hasHindi) {
      // Pure Devanagari Hindi script
      return { language: 'hi', confidence: 0.95 };
    }

    if (hinglishScore >= 2) {
      // 2+ Hinglish pattern matches in Roman script → Hinglish
      return { language: 'hi-en', confidence: Math.min(0.7 + hinglishScore * 0.05, 0.95), isHinglish: true };
    }

    if (hinglishScore === 1 && englishScore < 3) {
      return { language: 'hi-en', confidence: 0.65, isHinglish: true };
    }

    // Default to English
    return { language: 'en', confidence: Math.min(0.5 + englishScore * 0.1, 0.99) };
  }

  private scoreHinglish(text: string): number {
    return this.HINGLISH_PATTERNS.filter(p => p.test(text)).length;
  }

  private scoreEnglish(text: string): number {
    return this.ENGLISH_STRONG_WORDS.filter(p => p.test(text)).length * 2;
  }

  /**
   * Get human-readable language label from code
   */
  getLanguageLabel(languageCode: string): string {
    const labels: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      'hi-en': 'Hinglish',
      mr: 'Marathi',
    };
    return labels[languageCode] ?? languageCode;
  }

  /**
   * Normalize language code to Faster Whisper supported codes
   */
  normalizeForWhisper(languageCode: string): string {
    const normalized: Record<string, string> = {
      'hi-en': 'hi',
      en: 'en',
      hi: 'hi',
      mr: 'mr',
    };
    return normalized[languageCode] ?? 'en';
  }
}
