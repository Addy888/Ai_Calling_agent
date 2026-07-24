import { Test, TestingModule } from '@nestjs/testing';
import { LanguageDetector } from '../services/language-detector';

describe('LanguageDetector', () => {
  let detector: LanguageDetector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LanguageDetector],
    }).compile();

    detector = module.get<LanguageDetector>(LanguageDetector);
  });

  it('should be defined', () => {
    expect(detector).toBeDefined();
  });

  describe('English Detection', () => {
    it('should detect pure English text', () => {
      const text = 'Hello, how are you doing today? I would like to help you.';
      
      const result = detector.detect(text);
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.isHinglish).toBeUndefined();
    });

    it('should detect English with high confidence for common words', () => {
      const text = 'The quick brown fox jumps over the lazy dog. This is a test.';
      
      const result = detector.detect(text);
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle empty text', () => {
      const result = detector.detect('');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('Hindi Detection', () => {
    it('should detect Devanagari Hindi script', () => {
      const text = 'नमस्ते, आप कैसे हैं?';
      
      const result = detector.detect(text);
      
      expect(result.language).toBe('hi');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect mixed Hindi-English with Devanagari', () => {
      const text = 'Hello नमस्ते how are you आप कैसे हैं';
      
      const result = detector.detect(text);
      
      expect(result.language).toBe('hi');
      expect(result.isHinglish).toBe(true);
    });
  });

  describe('Hinglish Detection', () => {
    it('should detect Hinglish with Roman Hindi words', () => {
      const text = 'Haan, main theek hu. Aap kaise ho?';
      
      const result = detector.detect(text);
      
      expect(result.language).toBe('hi-en');
      expect(result.isHinglish).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect common Hinglish patterns', () => {
      const testCases = [
        'Nahi yaar, abhi nahi',
        'Theek hai bhai, karo',
        'Matlab kya hai?',
        'Acha, sun lo',
        'Kya bol rahe ho?',
      ];

      testCases.forEach(text => {
        const result = detector.detect(text);
        expect(result.isHinglish).toBe(true);
      });
    });

    it('should detect question words in Hinglish', () => {
      const testCases = [
        'Kaise ho?',
        'Kyun nahi?',
        'Kab aayega?',
        'Kahan jaa rahe ho?',
        'Kitna hai?',
        'Kaun hai?',
      ];

      testCases.forEach(text => {
        const result = detector.detect(text);
        expect(result.isHinglish).toBe(true);
      });
    });

    it('should handle mixed English and Hinglish', () => {
      const text = 'I am going yaar, but acha wait karo please';
      
      const result = detector.detect(text);
      
      expect(result.isHinglish).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence for more language markers', () => {
      const lowMarkers = 'Haan ok';
      const highMarkers = 'Haan theek hai yaar matlab kya karo';
      
      const lowResult = detector.detect(lowMarkers);
      const highResult = detector.detect(highMarkers);
      
      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
    });

    it('should have moderate confidence for ambiguous text', () => {
      const text = 'Hello hi';
      
      const result = detector.detect(text);
      
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('Language Labels', () => {
    it('should return correct language labels', () => {
      expect(detector.getLanguageLabel('en')).toBe('English');
      expect(detector.getLanguageLabel('hi')).toBe('Hindi');
      expect(detector.getLanguageLabel('hi-en')).toBe('Hinglish');
      expect(detector.getLanguageLabel('mr')).toBe('Marathi');
    });

    it('should return code for unknown languages', () => {
      expect(detector.getLanguageLabel('unknown')).toBe('unknown');
    });
  });

  describe('Whisper Normalization', () => {
    it('should normalize language codes for Whisper', () => {
      expect(detector.normalizeForWhisper('en')).toBe('en');
      expect(detector.normalizeForWhisper('hi')).toBe('hi');
      expect(detector.normalizeForWhisper('hi-en')).toBe('hi');
      expect(detector.normalizeForWhisper('mr')).toBe('mr');
    });

    it('should default to English for unknown codes', () => {
      expect(detector.normalizeForWhisper('unknown')).toBe('en');
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only text', () => {
      const result = detector.detect('   \n\t  ');
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.5);
    });

    it('should handle numbers and punctuation', () => {
      const result = detector.detect('123 456 !!! ???');
      
      expect(result.language).toBe('en');
    });

    it('should handle single word', () => {
      const englishResult = detector.detect('Hello');
      const hinglishResult = detector.detect('haan');
      
      expect(englishResult.language).toBe('en');
      expect(hinglishResult.language).toBe('hi-en');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should detect customer service English', () => {
      const text = 'Thank you for calling. How may I help you today?';
      
      const result = detector.detect(text);
      
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect customer service Hinglish', () => {
      const text = 'Hello ji, aapko kya chahiye? Main aapki help karunga.';
      
      const result = detector.detect(text);
      
      expect(result.isHinglish).toBe(true);
    });

    it('should detect code-switching patterns', () => {
      const text = 'Okay theek hai, I will call you back later yaar.';
      
      const result = detector.detect(text);
      
      expect(result.isHinglish).toBe(true);
    });
  });
});
