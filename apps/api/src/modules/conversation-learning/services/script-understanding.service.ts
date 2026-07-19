import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

interface ScriptSection {
  type: string;
  content: string;
  keywords: string[];
  timing: any;
}

@Injectable()
export class ScriptUnderstandingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Process and understand uploaded script
   * Extract conversation phases, patterns, and natural flow
   */
  async processScript(dto: any, companyId: string, uploadedBy: string) {
    const { name, language, scriptType, content, metadata } = dto;

    // Step 1: Parse the script structure
    const sections = await this.parseScriptStructure(content, language);

    // Step 2: Extract conversation patterns
    const patterns = await this.extractPatterns(sections);

    // Step 3: Identify key phrases and responses
    const keyPhrases = sections.flatMap(s => s.keywords);

    // Step 4: Understand natural flow
    const flow = await this.analyzeConversationFlow(sections);

    // Step 5: Extract objection handling strategies
    const objectionHandling = await this.extractObjectionHandling(sections);

    // Step 6: Create script record
    const script = await this.prisma.conversationScript.create({
      data: {
        companyId,
        name,
        language,
        scriptType: scriptType || 'SALES',
        content,
        metadata: {
          uploadedBy,
          sections: sections.length,
          patterns: patterns.length,
          keyPhrases: keyPhrases.length,
          ...metadata,
        },
        isActive: true,
        uploadedBy,
        sections: {
          create: sections.map((section, index) => ({
            companyId,
            sectionType: section.type,
            orderIndex: index,
            content: section.content,
            expectedDuration: section.timing?.expectedDuration || 0,
            keyPhrases: section.keywords,
            isRequired: this.isRequiredSection(section.type),
            isActive: true,
          })),
        },
      },
      include: {
        sections: true,
      },
    });

    // Step 7: Store learned patterns
    await this.storeLearnedPatterns(script.id, companyId, patterns, keyPhrases, objectionHandling);

    // Step 8: Generate script insights
    const insights = await this.generateScriptInsights(script, sections, patterns);

    return {
      script,
      insights,
      message: 'Script processed and understood successfully',
    };
  }

  /**
   * Parse script into structured sections
   */
  private async parseScriptStructure(content: string, language: string): Promise<ScriptSection[]> {
    const sections: ScriptSection[] = [];

    // Split content into logical sections
    const lines = content.split(/\n+/).filter((line) => line.trim().length > 0);

    let currentSection: ScriptSection | null = null;
    let sectionContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect section headers
      const sectionType = this.detectSectionType(trimmedLine);

      if (sectionType) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          currentSection.content = sectionContent.join('\n');
          currentSection.keywords = this.extractKeywords(currentSection.content, language);
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          type: sectionType,
          content: '',
          keywords: [],
          timing: this.estimateSectionTiming(sectionType),
        };
        sectionContent = [];
      } else if (currentSection) {
        // Add to current section
        sectionContent.push(trimmedLine);
      } else {
        // No section yet, start with INTRODUCTION
        currentSection = {
          type: 'INTRODUCTION',
          content: '',
          keywords: [],
          timing: this.estimateSectionTiming('INTRODUCTION'),
        };
        sectionContent.push(trimmedLine);
      }
    }

    // Save last section
    if (currentSection && sectionContent.length > 0) {
      currentSection.content = sectionContent.join('\n');
      currentSection.keywords = this.extractKeywords(currentSection.content, language);
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Detect section type from text
   */
  private detectSectionType(text: string): string | null {
    const lowerText = text.toLowerCase();

    // Section markers
    if (
      lowerText.includes('greeting') ||
      lowerText.includes('hello') ||
      lowerText.includes('namaste') ||
      lowerText.includes('good morning')
    ) {
      return 'GREETING';
    }

    if (
      lowerText.includes('introduction') ||
      lowerText.includes('introduce') ||
      lowerText.includes('calling from')
    ) {
      return 'INTRODUCTION';
    }

    if (
      lowerText.includes('qualification') ||
      lowerText.includes('requirement') ||
      lowerText.includes('looking for')
    ) {
      return 'QUALIFICATION';
    }

    if (lowerText.includes('budget') || lowerText.includes('price') || lowerText.includes('cost')) {
      return 'BUDGET_COLLECTION';
    }

    if (
      lowerText.includes('recommendation') ||
      lowerText.includes('suggest') ||
      lowerText.includes('perfect for you')
    ) {
      return 'PROJECT_RECOMMENDATION';
    }

    if (
      lowerText.includes('objection') ||
      lowerText.includes('concern') ||
      lowerText.includes('if customer says')
    ) {
      return 'OBJECTION_HANDLING';
    }

    if (
      lowerText.includes('closing') ||
      lowerText.includes('site visit') ||
      lowerText.includes('next step')
    ) {
      return 'CLOSING';
    }

    if (
      lowerText.includes('referral') ||
      lowerText.includes('recommend') ||
      lowerText.includes('know anyone')
    ) {
      return 'REFERRAL_REQUEST';
    }

    // Check if this is a header line (short, ends with colon, all caps, etc.)
    if (
      (text.endsWith(':') || text.match(/^[A-Z\s]+$/)) &&
      text.length < 50 &&
      !text.includes('.')
    ) {
      // Generic section header
      return text.replace(':', '').trim().toUpperCase().replace(/\s+/g, '_');
    }

    return null;
  }

  /**
   * Extract conversation patterns from script
   */
  private async extractPatterns(sections: ScriptSection[]): Promise<any[]> {
    const patterns: any[] = [];

    for (const section of sections) {
      // Extract question patterns
      const questions = this.extractQuestions(section.content);
      if (questions.length > 0) {
        patterns.push({
          type: 'QUESTION_PATTERN',
          section: section.type,
          patterns: questions,
          usage: 'Ask these questions naturally during conversation',
        });
      }

      // Extract response patterns
      const responses = this.extractResponses(section.content);
      if (responses.length > 0) {
        patterns.push({
          type: 'RESPONSE_PATTERN',
          section: section.type,
          patterns: responses,
          usage: 'Use these response styles when answering',
        });
      }

      // Extract transition phrases
      const transitions = this.extractTransitions(section.content);
      if (transitions.length > 0) {
        patterns.push({
          type: 'TRANSITION_PATTERN',
          section: section.type,
          patterns: transitions,
          usage: 'Use these to move between topics naturally',
        });
      }
    }

    return patterns;
  }

  /**
   * Extract questions from text
   */
  private extractQuestions(text: string): string[] {
    const sentences = text.split(/[.!?]+/);
    return sentences
      .filter(
        (s) =>
          s.includes('?') ||
          s.toLowerCase().includes('what') ||
          s.toLowerCase().includes('how') ||
          s.toLowerCase().includes('when') ||
          s.toLowerCase().includes('kya') ||
          s.toLowerCase().includes('kaise') ||
          s.toLowerCase().includes('kab'),
      )
      .map((q) => q.trim())
      .filter((q) => q.length > 5);
  }

  /**
   * Extract response patterns
   */
  private extractResponses(text: string): string[] {
    const responses: string[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    // Look for response indicators
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (
        lower.includes('you can') ||
        lower.includes('we have') ||
        lower.includes('our') ||
        lower.includes('this is') ||
        lower.includes('aap') ||
        lower.includes('hamare')
      ) {
        responses.push(sentence.trim());
      }
    }

    return responses;
  }

  /**
   * Extract transition phrases
   */
  private extractTransitions(text: string): string[] {
    const transitions: string[] = [];
    const patterns = [
      'moving on',
      'next',
      'now',
      'also',
      'additionally',
      'furthermore',
      'ab',
      'phir',
      'aur',
      'iske alawa',
      'great',
      'perfect',
      'excellent',
      'wonderful',
    ];

    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (patterns.some((p) => lower.includes(p))) {
        transitions.push(sentence.trim());
      }
    }

    return transitions;
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string, language: string): string[] {
    const keywords = new Set<string>();

    // Common important words in real estate context
    const importantWords = [
      'property',
      'flat',
      'apartment',
      'bhk',
      'price',
      'location',
      'amenity',
      'possession',
      'payment',
      'budget',
      'sqft',
      'area',
      'ghar',
      'sampatti',
      'keemat',
      'sthan',
      'suvidha',
    ];

    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    for (const word of words) {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (importantWords.includes(cleaned)) {
        keywords.add(cleaned);
      }
    }

    return Array.from(keywords);
  }

  /**
   * Estimate timing for section
   */
  private estimateSectionTiming(sectionType: string): any {
    const timings: Record<string, any> = {
      GREETING: { expectedDuration: 10, minDuration: 5, maxDuration: 15 },
      INTRODUCTION: { expectedDuration: 20, minDuration: 15, maxDuration: 30 },
      QUALIFICATION: { expectedDuration: 60, minDuration: 30, maxDuration: 120 },
      BUDGET_COLLECTION: { expectedDuration: 45, minDuration: 20, maxDuration: 90 },
      PROJECT_RECOMMENDATION: { expectedDuration: 90, minDuration: 60, maxDuration: 180 },
      OBJECTION_HANDLING: { expectedDuration: 60, minDuration: 30, maxDuration: 120 },
      CLOSING: { expectedDuration: 30, minDuration: 15, maxDuration: 60 },
      REFERRAL_REQUEST: { expectedDuration: 20, minDuration: 10, maxDuration: 40 },
    };

    return timings[sectionType] || { expectedDuration: 30, minDuration: 10, maxDuration: 60 };
  }

  /**
   * Analyze natural conversation flow
   */
  private async analyzeConversationFlow(sections: ScriptSection[]): Promise<any> {
    return {
      totalSections: sections.length,
      flowSequence: sections.map((s) => s.type),
      estimatedDuration: sections.reduce((sum, s) => sum + (s.timing?.expectedDuration || 0), 0),
      flexibilityPoints: this.identifyFlexibilityPoints(sections),
      criticalSections: sections.filter((s) => this.isRequiredSection(s.type)).map((s) => s.type),
    };
  }

  /**
   * Identify flexibility points where order can change
   */
  private identifyFlexibilityPoints(sections: ScriptSection[]): string[] {
    const flexible = [];
    const rigidStart = ['GREETING', 'INTRODUCTION'];
    const rigidEnd = ['CLOSING', 'REFERRAL_REQUEST'];

    for (let i = 0; i < sections.length; i++) {
      const type = sections[i].type;
      if (!rigidStart.includes(type) && !rigidEnd.includes(type)) {
        flexible.push(type);
      }
    }

    return flexible;
  }

  /**
   * Check if section is required
   */
  private isRequiredSection(sectionType: string): boolean {
    const required = ['GREETING', 'INTRODUCTION', 'QUALIFICATION', 'CLOSING'];
    return required.includes(sectionType);
  }

  /**
   * Extract objection handling strategies
   */
  private async extractObjectionHandling(sections: ScriptSection[]): Promise<any[]> {
    const strategies: any[] = [];

    const objectionSection = sections.find((s) => s.type === 'OBJECTION_HANDLING');
    if (!objectionSection) return strategies;

    // Parse objection-response pairs
    const lines = objectionSection.content.split('\n');
    let currentObjection = null;
    let currentResponse = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect objection
      if (
        trimmed.toLowerCase().includes('if') ||
        trimmed.toLowerCase().includes('when') ||
        trimmed.toLowerCase().includes('customer says') ||
        trimmed.toLowerCase().includes('objection:')
      ) {
        // Save previous pair
        if (currentObjection && currentResponse.length > 0) {
          strategies.push({
            objection: currentObjection,
            response: currentResponse.join(' '),
            strategy: this.identifyStrategy(currentResponse.join(' ')),
          });
        }
        currentObjection = trimmed;
        currentResponse = [];
      } else if (currentObjection) {
        currentResponse.push(trimmed);
      }
    }

    // Save last pair
    if (currentObjection && currentResponse.length > 0) {
      strategies.push({
        objection: currentObjection,
        response: currentResponse.join(' '),
        strategy: this.identifyStrategy(currentResponse.join(' ')),
      });
    }

    return strategies;
  }

  /**
   * Identify objection handling strategy type
   */
  private identifyStrategy(response: string): string {
    const lower = response.toLowerCase();

    if (lower.includes('understand') || lower.includes('appreciate')) {
      return 'EMPATHY_FIRST';
    }
    if (lower.includes('however') || lower.includes('but')) {
      return 'ACKNOWLEDGE_AND_REFRAME';
    }
    if (lower.includes('let me explain') || lower.includes('actually')) {
      return 'CLARIFICATION';
    }
    if (lower.includes('other customers') || lower.includes('many clients')) {
      return 'SOCIAL_PROOF';
    }
    if (lower.includes('what if') || lower.includes('consider')) {
      return 'ALTERNATIVE_OFFER';
    }

    return 'DIRECT_RESPONSE';
  }

  /**
   * Store learned patterns in database
   */
  private async storeLearnedPatterns(
    scriptId: string,
    companyId: string,
    patterns: any[],
    keyPhrases: any[],
    objectionHandling: any[],
  ) {
    // Store as conversation rules
    for (const pattern of patterns) {
      await this.prisma.conversationRule.create({
        data: {
          companyId,
          ruleType: 'HOW_TO_ANSWER',
          name: `${pattern.section} - ${pattern.type}`,
          description: pattern.usage || 'Script learning pattern',
          condition: { section: pattern.section },
          action: { patterns: pattern.patterns, usage: pattern.usage },
          priority: this.getRulePriority(pattern.type),
          isActive: true,
          learnedFrom: 'SCRIPT_LEARNING',
          metadata: { scriptId },
        },
      });
    }

    // Store objection handling as response strategies
    for (const objection of objectionHandling) {
      await this.prisma.responseStrategy.create({
        data: {
          companyId,
          triggerIntent: objection.objection.substring(0, 100),
          triggerContext: { objection: objection.objection },
          strategyType: objection.strategy,
          strategyName: `Objection Handling: ${objection.strategy}`,
          description: `Learned from script: ${objection.objection}`,
          responseTemplate: objection.response,
          isActive: true,
          learnedFrom: 'SCRIPT_LEARNING',
          metadata: {
            response: objection.response,
            scriptId,
          },
        },
      });
    }
  }

  /**
   * Get rule priority based on pattern type
   */
  private getRulePriority(patternType: string): number {
    const priorities: Record<string, number> = {
      QUESTION_PATTERN: 80,
      RESPONSE_PATTERN: 70,
      TRANSITION_PATTERN: 60,
    };
    return priorities[patternType] || 50;
  }

  /**
   * Generate insights from script analysis
   */
  private async generateScriptInsights(
    script: any,
    sections: ScriptSection[],
    patterns: any[],
  ): Promise<any> {
    return {
      scriptId: script.id,
      totalSections: sections.length,
      totalPatterns: patterns.length,
      estimatedCallDuration: sections.reduce(
        (sum, s) => sum + (s.timing?.expectedDuration || 0),
        0,
      ),
      learnedPatterns: patterns.map((p) => ({
        type: p.type,
        count: p.patterns.length,
      })),
      recommendations: this.generateRecommendations(sections, patterns),
    };
  }

  /**
   * Generate recommendations for script improvement
   */
  private generateRecommendations(sections: ScriptSection[], patterns: any[]): string[] {
    const recommendations: string[] = [];

    // Check if all required sections present
    const requiredSections = ['GREETING', 'INTRODUCTION', 'QUALIFICATION', 'CLOSING'];
    const presentSections = sections.map((s) => s.type);

    for (const required of requiredSections) {
      if (!presentSections.includes(required)) {
        recommendations.push(`Add ${required} section for complete conversation flow`);
      }
    }

    // Check for objection handling
    if (!presentSections.includes('OBJECTION_HANDLING')) {
      recommendations.push('Add objection handling strategies to improve success rate');
    }

    // Check pattern variety
    const questionPatterns = patterns.filter((p) => p.type === 'QUESTION_PATTERN');
    if (questionPatterns.length === 0) {
      recommendations.push('Add more question examples to improve engagement');
    }

    return recommendations;
  }

  /**
   * Get all scripts for company
   */
  async getScripts(companyId: string) {
    return await this.prisma.conversationScript.findMany({
      where: { companyId },
      include: {
        sections: true,
        _count: {
          select: {
            sections: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get script details
   */
  async getScriptDetails(scriptId: string, companyId: string) {
    const script = await this.prisma.conversationScript.findFirst({
      where: { id: scriptId, companyId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!script) {
      throw new HttpException('Script not found', HttpStatus.NOT_FOUND);
    }

    return script;
  }
}
