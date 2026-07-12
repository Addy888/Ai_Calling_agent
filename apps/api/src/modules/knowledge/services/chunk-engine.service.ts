import { Injectable } from '@nestjs/common';
import { ChunkType } from '../dto/knowledge.dto';

interface ChunkResult {
  content: string;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  tokenCount: number;
  metadata?: any;
}

@Injectable()
export class ChunkEngineService {
  async createChunks(
    text: string,
    chunkType: ChunkType,
    chunkSize: number = 512,
    chunkOverlap: number = 50,
  ): Promise<ChunkResult[]> {
    switch (chunkType) {
      case ChunkType.PARAGRAPH:
        return this.chunkByParagraph(text, chunkSize, chunkOverlap);
      case ChunkType.HEADING:
        return this.chunkByHeading(text, chunkSize, chunkOverlap);
      case ChunkType.SENTENCE:
        return this.chunkBySentence(text, chunkSize, chunkOverlap);
      case ChunkType.TOKEN:
        return this.chunkByToken(text, chunkSize, chunkOverlap);
      default:
        return this.chunkByParagraph(text, chunkSize, chunkOverlap);
    }
  }

  private chunkByParagraph(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): ChunkResult[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: ChunkResult[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;

      if (
        this.estimateTokenCount(currentChunk + ' ' + trimmedParagraph) >
        chunkSize
      ) {
        if (currentChunk) {
          chunks.push(this.createChunkResult(currentChunk, chunkIndex++, position));
          const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          currentChunk = overlapText + ' ' + trimmedParagraph;
        } else {
          currentChunk = trimmedParagraph;
        }
      } else {
        currentChunk = currentChunk
          ? currentChunk + '\n\n' + trimmedParagraph
          : trimmedParagraph;
      }

      position += trimmedParagraph.length + 2;
    }

    if (currentChunk) {
      chunks.push(this.createChunkResult(currentChunk, chunkIndex, position));
    }

    return chunks;
  }

  private chunkByHeading(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): ChunkResult[] {
    const lines = text.split('\n');
    const chunks: ChunkResult[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;
    let currentHeading = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const isHeading = /^#{1,6}\s/.test(trimmedLine) || trimmedLine.length < 100 && /^[A-Z]/.test(trimmedLine);

      if (isHeading && currentChunk) {
        chunks.push(
          this.createChunkResult(currentChunk, chunkIndex++, position, {
            heading: currentHeading,
          }),
        );
        currentHeading = trimmedLine;
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = currentHeading + '\n' + overlapText;
      } else if (isHeading) {
        currentHeading = trimmedLine;
        currentChunk = currentHeading;
      } else {
        if (
          this.estimateTokenCount(currentChunk + ' ' + trimmedLine) > chunkSize
        ) {
          chunks.push(
            this.createChunkResult(currentChunk, chunkIndex++, position, {
              heading: currentHeading,
            }),
          );
          const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          currentChunk = currentHeading + '\n' + overlapText + '\n' + trimmedLine;
        } else {
          currentChunk = currentChunk + '\n' + trimmedLine;
        }
      }

      position += trimmedLine.length + 1;
    }

    if (currentChunk) {
      chunks.push(
        this.createChunkResult(currentChunk, chunkIndex, position, {
          heading: currentHeading,
        }),
      );
    }

    return chunks;
  }

  private chunkBySentence(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): ChunkResult[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: ChunkResult[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if (
        this.estimateTokenCount(currentChunk + ' ' + trimmedSentence) >
        chunkSize
      ) {
        if (currentChunk) {
          chunks.push(this.createChunkResult(currentChunk, chunkIndex++, position));
          const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          currentChunk = overlapText + ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
      } else {
        currentChunk = currentChunk
          ? currentChunk + ' ' + trimmedSentence
          : trimmedSentence;
      }

      position += trimmedSentence.length + 1;
    }

    if (currentChunk) {
      chunks.push(this.createChunkResult(currentChunk, chunkIndex, position));
    }

    return chunks;
  }

  private chunkByToken(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): ChunkResult[] {
    const words = text.split(/\s+/);
    const chunks: ChunkResult[] = [];
    let chunkIndex = 0;

    for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');
      chunks.push(this.createChunkResult(chunkText, chunkIndex++, i));
    }

    return chunks;
  }

  private createChunkResult(
    content: string,
    chunkIndex: number,
    startPosition: number,
    metadata?: any,
  ): ChunkResult {
    return {
      content: content.trim(),
      chunkIndex,
      startPosition,
      endPosition: startPosition + content.length,
      tokenCount: this.estimateTokenCount(content),
      metadata,
    };
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    const words = text.split(/\s+/);
    const overlapWords = words.slice(-overlapSize);
    return overlapWords.join(' ');
  }

  async validateChunkSize(chunkSize: number): Promise<boolean> {
    return chunkSize >= 100 && chunkSize <= 2000;
  }

  async validateChunkOverlap(
    chunkOverlap: number,
    chunkSize: number,
  ): Promise<boolean> {
    return chunkOverlap >= 0 && chunkOverlap < chunkSize;
  }
}
