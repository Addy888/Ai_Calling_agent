import { Injectable } from '@nestjs/common';
import { DocumentFileType } from '../dto/knowledge.dto';

@Injectable()
export class DocumentParserService {
  async parseDocument(
    content: string,
    fileType: DocumentFileType,
  ): Promise<string> {
    switch (fileType) {
      case DocumentFileType.TXT:
        return this.parseTxt(content);
      case DocumentFileType.JSON:
        return this.parseJson(content);
      case DocumentFileType.CSV:
        return this.parseCsv(content);
      case DocumentFileType.MARKDOWN:
        return this.parseMarkdown(content);
      case DocumentFileType.PDF:
        return this.parsePdf(content);
      case DocumentFileType.DOCX:
        return this.parseDocx(content);
      default:
        return content;
    }
  }

  private parseTxt(content: string): string {
    return this.normalizeText(content);
  }

  private parseJson(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return this.normalizeText(JSON.stringify(parsed, null, 2));
    } catch {
      return this.normalizeText(content);
    }
  }

  private parseCsv(content: string): string {
    const lines = content.split('\n');
    const normalized = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
    return this.normalizeText(normalized);
  }

  private parseMarkdown(content: string): string {
    let text = content;
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    text = text.replace(/`{1,3}(.+?)`{1,3}/g, '$1');
    return this.normalizeText(text);
  }

  private parsePdf(content: string): string {
    return this.normalizeText(content);
  }

  private parseDocx(content: string): string {
    return this.normalizeText(content);
  }

  normalizeText(text: string): string {
    let normalized = text;
    normalized = normalized.replace(/\r\n/g, '\n');
    normalized = normalized.replace(/\r/g, '\n');
    normalized = normalized.replace(/\t/g, ' ');
    normalized = normalized.replace(/ {2,}/g, ' ');
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    normalized = normalized.trim();
    return normalized;
  }

  extractMetadata(content: string, fileType: DocumentFileType): any {
    const metadata: any = {
      characterCount: content.length,
      wordCount: this.countWords(content),
      lineCount: content.split('\n').length,
      fileType,
    };

    if (fileType === DocumentFileType.JSON) {
      try {
        const parsed = JSON.parse(content);
        metadata.jsonKeys = Object.keys(parsed);
      } catch {}
    }

    if (fileType === DocumentFileType.CSV) {
      const lines = content.split('\n');
      metadata.rowCount = lines.length;
      if (lines.length > 0) {
        metadata.columnCount = lines[0].split(',').length;
      }
    }

    return metadata;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  removeDuplicateLines(text: string): string {
    const lines = text.split('\n');
    const unique = Array.from(new Set(lines));
    return unique.join('\n');
  }

  async validateDocument(content: string, fileType: DocumentFileType): Promise<boolean> {
    if (!content || content.trim().length === 0) {
      return false;
    }

    if (fileType === DocumentFileType.JSON) {
      try {
        JSON.parse(content);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }
}
