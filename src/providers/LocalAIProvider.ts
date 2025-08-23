// providers/LocalAIProvider.ts
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// Type definitions for Ollama API responses
interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

interface OllamaTagsResponse {
    models?: OllamaModel[];
}

interface OllamaGenerateResponse {
    response?: string;
    done?: boolean;
}

interface OllamaEmbeddingResponse {
    embedding?: number[];
}

interface ModelConfig {
    name: string;
    size: string;
    purpose: 'completion' | 'chat' | 'embedding';
    contextWindow: number;
}

export class LocalAIProvider {
    private ollamaEndpoint = 'http://localhost:11434';
    private currentModel: string = 'deepseek-coder:6.7b';
    private context: vscode.ExtensionContext;
    private modelCache: Map<string, any> = new Map();
    
    private models: ModelConfig[] = [
        { name: 'deepseek-coder:6.7b', size: '6.7GB', purpose: 'completion', contextWindow: 16384 },
        { name: 'codellama:7b', size: '7GB', purpose: 'chat', contextWindow: 4096 },
        { name: 'starcoder2:3b', size: '3GB', purpose: 'completion', contextWindow: 8192 },
        { name: 'nomic-embed-text', size: '274MB', purpose: 'embedding', contextWindow: 8192 }
    ];
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeOllama();
    }
    
    private async initializeOllama() {
        // Check if Ollama is installed
        try {
            const { stdout } = await execAsync('ollama --version');
            console.log('Ollama version:', stdout);
        } catch (error) {
            const install = await vscode.window.showErrorMessage(
                'Ollama is not installed. It\'s required for local AI processing.',
                'Install Guide'
            );
            if (install === 'Install Guide') {
                vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai/download'));
            }
        }
    }
    
    async checkModelStatus(): Promise<{ isReady: boolean; models: string[] }> {
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
            const data = await response.json() as OllamaTagsResponse;
            const installedModels = data.models?.map((m) => m.name) || [];
            
            const hasRequiredModels = this.models.some(m => 
                installedModels.includes(m.name)
            );
            
            return {
                isReady: hasRequiredModels,
                models: installedModels
            };
        } catch (error) {
            return { isReady: false, models: [] };
        }
    }
    
    async downloadModels(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ) {
        const modelsToDownload = [
            'deepseek-coder:6.7b',  // Primary model
            'nomic-embed-text'       // For embeddings
        ];
        
        for (let i = 0; i < modelsToDownload.length; i++) {
            if (token.isCancellationRequested) break;
            
            const model = modelsToDownload[i];
            progress.report({
                message: `Downloading ${model}...`,
                increment: (100 / modelsToDownload.length) * i
            });
            
            try {
                await execAsync(`ollama pull ${model}`);
            } catch (error) {
                console.error(`Failed to download ${model}:`, error);
            }
        }
        
        progress.report({ message: 'Models ready!', increment: 100 });
    }
    
    async generateCompletion(
        prompt: string,
        context: string,
        maxTokens: number = 150
    ): Promise<string> {
        const cacheKey = `${prompt.substring(0, 100)}_${context.substring(0, 100)}`;
        
        // Check cache first
        if (this.modelCache.has(cacheKey)) {
            return this.modelCache.get(cacheKey);
        }
        
        const systemPrompt = `You are a code completion assistant. 
        Complete the code naturally, following the existing style and patterns.
        ONLY return the completion, no explanations or markdown.`;
        
        const fullPrompt = `${systemPrompt}\n\nContext:\n${context}\n\nComplete this:\n${prompt}`;
        
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: fullPrompt,
                    stream: false,
                    options: {
                        temperature: 0.2,
                        top_p: 0.95,
                        num_predict: maxTokens,
                        stop: ['\n\n', '```', '</code>']
                    }
                })
            });
            
            const data = await response.json() as OllamaGenerateResponse;
            const completion = data.response?.trim() || '';
            
            // Cache the result
            this.modelCache.set(cacheKey, completion);
            if (this.modelCache.size > 100) {
                // Simple LRU: remove first item
                const firstKey = this.modelCache.keys().next().value;
                if (firstKey !== undefined) {
                    this.modelCache.delete(firstKey);
                }
            }
            
            return completion;
        } catch (error) {
            console.error('Local AI generation failed:', error);
            return '';
        }
    }
    
    async explainCode(code: string, context: string): Promise<string> {
        const prompt = `Explain this code concisely:\n\n${code}\n\nContext:\n${context}`;
        
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'codellama:7b',  // Better for explanations
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_predict: 500
                    }
                })
            });
            
            const data = await response.json() as OllamaGenerateResponse;
            return data.response || 'Unable to explain code';
        } catch (error) {
            console.error('Failed to explain code:', error);
            return 'Unable to explain code';
        }
    }
    
    async refactorCode(code: string, instruction: string, context: string): Promise<string> {
        const prompt = `Refactor this code according to the instruction.
        
Instruction: ${instruction}
Context: ${context}
Original Code:
${code}

Return ONLY the refactored code, no explanations:`;
        
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 1000
                    }
                })
            });
            
            const data = await response.json() as OllamaGenerateResponse;
            return data.response?.trim() || code;
        } catch (error) {
            console.error('Failed to refactor code:', error);
            return code;
        }
    }
    
    async generateTests(code: string, context: string): Promise<string> {
        const language = this.detectLanguage(code);
        const testFramework = this.getTestFramework(language);
        
        const prompt = `Generate unit tests for this code using ${testFramework}.
        
Context: ${context}
Code to test:
${code}

Generate comprehensive tests with edge cases:`;
        
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.2,
                        num_predict: 1500
                    }
                })
            });
            
            const data = await response.json() as OllamaGenerateResponse;
            return data.response || '// Unable to generate tests';
        } catch (error) {
            console.error('Failed to generate tests:', error);
            return '// Unable to generate tests';
        }
    }
    
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nomic-embed-text',
                    prompt: text
                })
            });
            
            const data = await response.json() as OllamaEmbeddingResponse;
            return data.embedding || [];
        } catch (error) {
            console.error('Embedding generation failed:', error);
            return [];
        }
    }
    
    async streamChat(
        message: string,
        context: string,
        onToken: (token: string) => void
    ): Promise<void> {
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'codellama:7b',
                    prompt: `Context: ${context}\n\nUser: ${message}\n\nAssistant:`,
                    stream: true
                })
            });
            
            const reader = response.body?.getReader();
            if (!reader) return;
            
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line) as OllamaGenerateResponse;
                            if (data.response) {
                                onToken(data.response);
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream chat failed:', error);
        }
    }
    
    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
            const data = await response.json() as OllamaTagsResponse;
            return data.models?.map((m) => m.name) || [];
        } catch (error) {
            return [];
        }
    }
    
    async switchModel(modelName: string) {
        this.currentModel = modelName;
        await this.context.globalState.update('selectedModel', modelName);
        
        // Clear cache when switching models
        this.modelCache.clear();
    }
    
    private detectLanguage(code: string): string {
        // Simple language detection based on syntax
        if (code.includes('def ') || code.includes('import ')) return 'python';
        if (code.includes('function') || code.includes('const ')) return 'javascript';
        if (code.includes('public class') || code.includes('private ')) return 'java';
        if (code.includes('fn ') || code.includes('let mut')) return 'rust';
        return 'unknown';
    }
    
    private getTestFramework(language: string): string {
        const frameworks: { [key: string]: string } = {
            'python': 'pytest',
            'javascript': 'jest',
            'typescript': 'jest',
            'java': 'JUnit',
            'rust': 'cargo test',
            'go': 'go test'
        };
        return frameworks[language] || 'unit tests';
    }
}