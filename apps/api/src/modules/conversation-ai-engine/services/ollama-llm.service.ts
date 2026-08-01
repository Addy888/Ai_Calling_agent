/**
 * Ollama LLM Service  
 * HTTP client for Ollama large language model API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ErrorHandlerService, ErrorType } from './error-handler.service';

export interface GenerateOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  system?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  tokens: number;
  latency: number;
}

@Injectable()
export class OllamaLLMService {
  private readonly logger = new Logger(OllamaLLMService.name);
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.baseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get('OLLAMA_MODEL', 'llama3');
    this.timeout = this.configService.get('OLLAMA_TIMEOUT_MS', 30000);

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Ollama LLM Service initialized: ${this.baseUrl}, model: ${this.defaultModel}`);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Generating response with ${options.model || this.defaultModel}`);

      const response = await this.httpClient.post('/api/generate', {
        model: options.model || this.defaultModel,
        prompt: options.prompt,
        system: options.system,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 2048,
        },
      });

      const latency = Date.now() - startTime;

      const result: GenerateResult = {
        text: response.data.response || '',
        model: response.data.model || options.model || this.defaultModel,
        tokens: response.data.eval_count || 0,
        latency,
      };

      this.logger.debug(`Generation complete (${latency}ms, ${result.tokens} tokens)`);

      return result;
    } catch (error) {
      this.logger.error(`Ollama generation failed: ${error.message}`, error.stack);

      const errorType = error.code === 'ECONNABORTED' 
        ? ErrorType.LLM_TIMEOUT 
        : ErrorType.LLM_ERROR;

      throw await this.errorHandler.handleError('ollama', error as Error, {
        type: errorType,
        retryable: true,
        retryFn: () => this.generate(options),
      });
    }
  }

  async generateStreaming(
    options: GenerateOptions,
    onChunk: (chunk: string) => Promise<void>,
  ): Promise<void> {
    try {
      this.logger.debug(`Streaming generation with ${options.model || this.defaultModel}`);

      const response = await this.httpClient.post('/api/generate', {
        model: options.model || this.defaultModel,
        prompt: options.prompt,
        system: options.system,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 2048,
        },
      }, {
        responseType: 'stream',
      });

      return new Promise((resolve, reject) => {
        response.data.on('data', async (chunk: Buffer) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              const data = JSON.parse(line);
              if (data.response) {
                await onChunk(data.response);
              }
              
              if (data.done) {
                resolve();
              }
            }
          } catch (error) {
            this.logger.error(`Error processing stream chunk: ${error.message}`);
          }
        });

        response.data.on('error', reject);
        response.data.on('end', resolve);
      });
    } catch (error) {
      this.logger.error(`Ollama streaming failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; models?: string[] }> {
    try {
      const response = await this.httpClient.get('/api/tags');
      const models = response.data.models?.map((m: any) => m.name) || [];

      return { 
        status: 'OK',
        models,
      };
    } catch (error) {
      this.logger.error(`Ollama health check failed: ${error.message}`);
      return { status: 'ERROR' };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.httpClient.get('/api/tags');
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      this.logger.error(`Failed to list models: ${error.message}`);
      return [];
    }
  }

  async generateWithFunctions(
    options: GenerateOptions & {
      functions?: Array<{
        name: string;
        description: string;
        parameters: any;
      }>;
    },
  ): Promise<GenerateResult & { functionCall?: { name: string; arguments: any } }> {
    // Add function definitions to prompt
    let enhancedPrompt = options.prompt;

    if (options.functions && options.functions.length > 0) {
      const functionsDescription = options.functions.map(f => 
        `${f.name}: ${f.description}\nParameters: ${JSON.stringify(f.parameters)}`
      ).join('\n\n');

      enhancedPrompt = `${options.prompt}\n\nAvailable functions:\n${functionsDescription}\n\nIf you need to call a function, respond in JSON format: {"function": "function_name", "arguments": {...}}`;
    }

    const result = await this.generate({
      ...options,
      prompt: enhancedPrompt,
    });

    // Try to parse function call from response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*"function"[\s\S]*\}/);
      if (jsonMatch) {
        const functionCall = JSON.parse(jsonMatch[0]);
        return {
          ...result,
          functionCall: {
            name: functionCall.function,
            arguments: functionCall.arguments || {},
          },
        };
      }
    } catch (error) {
      // Not a function call, return normal response
    }

    return result;
  }
}
