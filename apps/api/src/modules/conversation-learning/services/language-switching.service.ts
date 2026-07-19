import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface LanguageSwitch {
  fromLanguage: string;
  toLanguage: string;
  timestamp: number;
  trigger: string;
  context: string;
}

interface LanguagePreference {
  primaryLanguage: string;
  secondaryLanguages: string[];
  switchFrequency: number;
  preferredMix: string;
}

@Injectable()
export class LanguageSwitchingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Learn language switching patterns from conversations
   * Understand when and how to switch between languages naturally
   */
  async analyzeLanguageSwitching(recording: any, transcript: any): Promise<any> {
    const segments = transcript.segments || [];

    // Detect language for each segment
    const segmentsWithLanguage = segments.map((seg: any) => ({
      ...seg,
      detectedLanguage: this.detectLanguage(seg.text),
    }));

    // Find language switches
    const switches = this.findLanguageSwitches(segmentsWithLanguage);

    // Analyze patterns
    const patterns = this.analyzePatterns(switches, segmentsWithLanguage);

    // Store in database
    await this.storeLanguagePatterns(recording.id, recording.companyId, patterns);

    return patterns;
  }

  /**
   * Detect language of text
   */
  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();

    // Hindi indicators
    const hindiPatterns = [
      'ji',
      'haan',
      'nahi',
      'kya',
      'kaise',
      'kab',
      'kahan',
      'aap',
      'aapka',
      'mai',
      'mera',
      'hai',
      'hain',
      'tha',
      'the',
      'kar',
      'karke',
      'ke liye',
      'ke sath',
      'namaste',
      'dhanyavad',
      'shukriya',
    ];

    // Marathi indicators
    const marathiPatterns = [
      'tumhi',
      'mi',
      'maza',
      'kay',
      'kasa',
      'kuthun',
      'ahe',
      'aahe',
      'hota',
      'hoti',
      'karoon',
      'namaskar',
      'dhanyavaad',
    ];

    // English indicators
    const englishPatterns = [
      'the',
      'is',
      'are',
      'was',
      'were',
      'have',
      'has',
      'had',
      'will',
      'would',
      'can',
      'could',
      'should',
    ];

    let hindiScore = 0;
    let marathiScore = 0;
    let englishScore = 0;

    // Count pattern matches
    for (const pattern of hindiPatterns) {
      if (lowerText.includes(pattern)) hindiScore++;
    }
    for (const pattern of marathiPatterns) {
      if (lowerText.includes(pattern)) marathiScore++;
    }
    for (const pattern of englishPatterns) {
      if (lowerText.includes(pattern)) englishScore++;
    }

    // Mixed language detection
    const languagesDetected = [];
    if (hindiScore > 0) languagesDetected.push('HINDI');
    if (marathiScore > 0) languagesDetected.push('MARATHI');
    if (englishScore > 0) languagesDetected.push('ENGLISH');

    if (languagesDetected.length > 1) {
      return 'MIXED';
    }

    // Return dominant language
    if (hindiScore > marathiScore && hindiScore > englishScore) return 'HINDI';
    if (marathiScore > hindiScore && marathiScore > englishScore) return 'MARATHI';
    if (englishScore > 0) return 'ENGLISH';

    return 'UNKNOWN';
  }

  /**
   * Find language switches in conversation
   */
  private findLanguageSwitches(segments: any[]): LanguageSwitch[] {
    const switches: LanguageSwitch[] = [];

    for (let i = 1; i < segments.length; i++) {
      const prevSeg = segments[i - 1];
      const currSeg = segments[i];

      if (prevSeg.detectedLanguage !== currSeg.detectedLanguage) {
        // Language switch detected
        switches.push({
          fromLanguage: prevSeg.detectedLanguage,
          toLanguage: currSeg.detectedLanguage,
          timestamp: currSeg.start,
          trigger: this.identifySwitchTrigger(prevSeg, currSeg),
          context: prevSeg.text,
        });
      }
    }

    return switches;
  }

  /**
   * Identify what triggered the language switch
   */
  private identifySwitchTrigger(prevSeg: any, currSeg: any): string {
    // Check if customer switched first
    if (prevSeg.speaker === 'CUSTOMER' && currSeg.speaker === 'AGENT') {
      return 'CUSTOMER_LED';
    }

    // Check if agent switched to simplify
    const prevText = prevSeg.text.toLowerCase();
    if (prevText.includes('understand') || prevText.includes('samajh')) {
      return 'SIMPLIFICATION';
    }

    // Check if switch for specific terms
    const currText = currSeg.text.toLowerCase();
    if (
      currText.includes('bhk') ||
      currText.includes('lakh') ||
      currText.includes('crore') ||
      currText.includes('sqft')
    ) {
      return 'TECHNICAL_TERMS';
    }

    // Check if emotional moment
    if (
      currText.includes('great') ||
      currText.includes('perfect') ||
      currText.includes('excellent') ||
      currText.includes('accha') ||
      currText.includes('bahut accha')
    ) {
      return 'EMOTIONAL_EMPHASIS';
    }

    return 'NATURAL_FLOW';
  }

  /**
   * Analyze language switching patterns
   */
  private analyzePatterns(switches: LanguageSwitch[], segments: any[]): any {
    // Calculate switch frequency
    const totalDuration = segments.length > 0 ? segments[segments.length - 1].end : 0;
    const switchFrequency = totalDuration > 0 ? (switches.length / totalDuration) * 60 : 0; // switches per minute

    // Analyze language distribution
    const languageDistribution = this.calculateLanguageDistribution(segments);

    // Identify dominant language
    const dominantLanguage = this.findDominantLanguage(languageDistribution);

    // Analyze switch triggers
    const triggerCounts = this.countTriggers(switches);

    // Find common switch patterns
    const switchPatterns = this.identifyCommonSwitchPatterns(switches);

    // Generate mixing strategy
    const mixingStrategy = this.determineMixingStrategy(
      languageDistribution,
      switches,
      triggerCounts,
    );

    return {
      totalSwitches: switches.length,
      switchFrequency: Math.round(switchFrequency * 100) / 100,
      languageDistribution,
      dominantLanguage,
      triggerCounts,
      switchPatterns,
      mixingStrategy,
      recommendations: this.generateLanguageRecommendations(
        languageDistribution,
        switches,
        dominantLanguage,
      ),
    };
  }

  /**
   * Calculate language distribution across conversation
   */
  private calculateLanguageDistribution(segments: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    let totalDuration = 0;

    for (const seg of segments) {
      const duration = seg.end - seg.start;
      const lang = seg.detectedLanguage;

      distribution[lang] = (distribution[lang] || 0) + duration;
      totalDuration += duration;
    }

    // Convert to percentages
    for (const lang in distribution) {
      distribution[lang] = Math.round((distribution[lang] / totalDuration) * 100);
    }

    return distribution;
  }

  /**
   * Find dominant language
   */
  private findDominantLanguage(distribution: Record<string, number>): string {
    let maxPercentage = 0;
    let dominant = 'MIXED';

    for (const [lang, percentage] of Object.entries(distribution)) {
      if (percentage > maxPercentage) {
        maxPercentage = percentage;
        dominant = lang;
      }
    }

    return maxPercentage > 60 ? dominant : 'MIXED';
  }

  /**
   * Count switch triggers
   */
  private countTriggers(switches: LanguageSwitch[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const sw of switches) {
      counts[sw.trigger] = (counts[sw.trigger] || 0) + 1;
    }

    return counts;
  }

  /**
   * Identify common switch patterns
   */
  private identifyCommonSwitchPatterns(switches: LanguageSwitch[]): any[] {
    const patterns: Map<string, number> = new Map();

    for (const sw of switches) {
      const pattern = `${sw.fromLanguage}_TO_${sw.toLanguage}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: Math.round((count / switches.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Determine optimal mixing strategy
   */
  private determineMixingStrategy(
    distribution: Record<string, number>,
    switches: LanguageSwitch[],
    triggers: Record<string, number>,
  ): any {
    const mixedPercentage = distribution['MIXED'] || 0;
    const customerLedSwitches = triggers['CUSTOMER_LED'] || 0;

    let strategy = 'FOLLOW_CUSTOMER';
    let recommendations: string[] = [];

    if (customerLedSwitches > switches.length * 0.5) {
      strategy = 'FOLLOW_CUSTOMER';
      recommendations = [
        'Mirror customer language preference',
        'Switch immediately when customer switches',
        'Maintain flexibility',
      ];
    } else if (mixedPercentage > 40) {
      strategy = 'NATURAL_MIX';
      recommendations = [
        'Mix languages naturally',
        'Use local language for rapport',
        'Use English for technical terms',
      ];
    } else {
      const dominantLang = this.findDominantLanguage(distribution);
      strategy = `PRIMARILY_${dominantLang}`;
      recommendations = [
        `Keep conversation primarily in ${dominantLang}`,
        'Switch only for clarity',
        'Use technical terms in appropriate language',
      ];
    }

    return {
      strategy,
      recommendations,
      switchTiming: this.calculateOptimalSwitchTiming(switches),
    };
  }

  /**
   * Calculate optimal switch timing
   */
  private calculateOptimalSwitchTiming(switches: LanguageSwitch[]): string {
    if (switches.length === 0) return 'NO_SWITCHING';

    const naturalSwitches = switches.filter((s) => s.trigger === 'NATURAL_FLOW').length;
    const customerLedSwitches = switches.filter((s) => s.trigger === 'CUSTOMER_LED').length;

    if (customerLedSwitches > switches.length * 0.7) {
      return 'IMMEDIATE';
    }

    if (naturalSwitches > switches.length * 0.5) {
      return 'NATURAL';
    }

    return 'PURPOSEFUL';
  }

  /**
   * Generate language recommendations
   */
  private generateLanguageRecommendations(
    distribution: Record<string, number>,
    switches: LanguageSwitch[],
    dominantLanguage: string,
  ): string[] {
    const recommendations: string[] = [];

    // High switch frequency
    if (switches.length > 10) {
      recommendations.push('Too many language switches - try to maintain consistency');
    }

    // Mixed language usage
    if (distribution['MIXED'] > 50) {
      recommendations.push('Natural language mixing - continue this approach');
    }

    // Customer-led switches
    const customerLed = switches.filter((s) => s.trigger === 'CUSTOMER_LED').length;
    if (customerLed > switches.length * 0.5) {
      recommendations.push('Good job following customer language preference');
    }

    // Dominant language clarity
    if (dominantLanguage !== 'MIXED' && distribution[dominantLanguage] > 70) {
      recommendations.push(`Strong ${dominantLanguage} preference - maintain clarity`);
    }

    // Add general best practices
    recommendations.push('Switch languages smoothly without breaking flow');
    recommendations.push('Use local language for emotional connection');
    recommendations.push('Use English for technical/numerical information');

    return recommendations;
  }

  /**
   * Store language patterns in database
   */
  private async storeLanguagePatterns(recordingId: string, companyId: string, patterns: any) {
    // Store as speech pattern with metadata
    await this.prisma.speechPattern.create({
      data: {
        recordingId,
        companyId,
        speaker: 'AGENT',
        startTime: 0,
        endTime: 0,
        duration: 0,
        wordCount: 0,
        wordsPerMinute: 0,
        metadata: {
          languageSwitching: patterns,
          switchFrequency: patterns.switchFrequency,
          confidence: 90,
        },
      },
    });

    // Store insights
    if (patterns.recommendations.length > 0) {
      await this.prisma.learningInsight.create({
        data: {
          recordingId,
          companyId,
          insightType: 'LANGUAGE_PATTERN',
          category: 'LANGUAGE_SWITCHING',
          title: 'Language Switching Patterns',
          description: `Detected ${patterns.totalSwitches} language switches with ${patterns.dominantLanguage} as dominant language`,
          recommendation: patterns.recommendations.join('. '),
          supportingData: {
            patterns,
            recommendations: patterns.recommendations,
          },
          confidence: 85,
          priority: 1,
          isApplied: false,
        },
      });
    }
  }

  /**
   * Get language preference for company
   */
  async getLanguagePreference(companyId: string): Promise<LanguagePreference> {
    // Analyze all recordings for language patterns
    const patterns = await this.prisma.speechPattern.findMany({
      where: {
        companyId,
      },
    });

    if (patterns.length === 0) {
      return {
        primaryLanguage: 'ENGLISH',
        secondaryLanguages: ['HINDI'],
        switchFrequency: 0,
        preferredMix: 'FOLLOW_CUSTOMER',
      };
    }

    // Aggregate language distribution from metadata
    const aggregateDistribution: Record<string, number> = {};
    let totalSwitches = 0;

    for (const pattern of patterns) {
      const metadata = pattern.metadata as any;
      if (metadata?.languageSwitching) {
        totalSwitches += metadata.languageSwitching.totalSwitches || 0;

        for (const [lang, percentage] of Object.entries(metadata.languageSwitching.languageDistribution || {})) {
          aggregateDistribution[lang] = (aggregateDistribution[lang] || 0) + (percentage as number);
        }
      }
    }

    // Calculate averages
    for (const lang in aggregateDistribution) {
      aggregateDistribution[lang] = Math.round(aggregateDistribution[lang] / patterns.length);
    }

    // Determine preferences
    const sortedLanguages = Object.entries(aggregateDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, _]) => lang);

    const primaryLanguage = sortedLanguages[0] || 'ENGLISH';
    const secondaryLanguages = sortedLanguages.slice(1, 3);
    const avgSwitchFrequency = totalSwitches / patterns.length;

    return {
      primaryLanguage,
      secondaryLanguages,
      switchFrequency: Math.round(avgSwitchFrequency * 100) / 100,
      preferredMix: avgSwitchFrequency > 5 ? 'NATURAL_MIX' : 'FOLLOW_CUSTOMER',
    };
  }
}
