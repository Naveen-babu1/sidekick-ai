import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const execAsync = promisify(exec);

interface LlamaCppResponse {
    content?: string;
    generation_settings?: any;
    model?: string;
    prompt?: string;
    stop?: boolean;
    stopped_eos?: boolean;
    stopped_limit?: boolean;
    stopped_word?: boolean;
    stopping_word?: string;
    timings?: {
        predicted_ms?: number;
        predicted_n?: number;
        predicted_per_second?: number;
        prompt_ms?: number;
        prompt_n?: number;
    };
    tokens_cached?: number;
    tokens_evaluated?: number;
    tokens_predicted?: number;
    truncated?: boolean;
}

interface ModelConfig {
    name: string;
    path: string;
    contextSize: number;
    format: 'gguf' | 'ggml';
    useGpu?: boolean;
}

export class LocalAIProvider {
    private llamaEndpoint = 'http://localhost:8080';
    private llamaProcess: any = null;
    private context: vscode.ExtensionContext;
    private modelCache: Map<string, string> = new Map();
    private isServerRunning = false;
    
    // Configure your model here
    private currentModel: ModelConfig = {
        name: 'qwen2.5-coder-1.5b',
        path: '', // Will be set to model path
        contextSize: 4096,
        format: 'gguf',
        useGpu: false // Set to true if you have CUDA/Metal support
    };
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeLlamaCpp();
    }
    
    private async initializeLlamaCpp() {
        // Check if llama.cpp server is already running
        try {
            const response = await fetch(`${this.llamaEndpoint}/health`);
            if (response.ok) {
                this.isServerRunning = true;
                console.log('llama.cpp server is already running');
                return;
            }
        } catch (error) {
            // Server not running, we'll start it
        }
        
        // Get or download model
        const modelPath = await this.ensureModel();
        if (!modelPath) {
            vscode.window.showErrorMessage(
                'Failed to initialize llama.cpp model. Please check the model path.'
            );
            return;
        }
        
        this.currentModel.path = modelPath;
        
        // Start llama.cpp server
        await this.startLlamaCppServer();
    }
    
    private async ensureModel(): Promise<string | null> {

        const knownModelPath = 'C:\\Users\\navee\\sidekick-ai\\sidekick-ai\\.models\\deepseek-coder-1.3b.gguf';
    try {
        await fs.access(knownModelPath);
        console.log(`Found model at: ${knownModelPath}`);
        return knownModelPath;
    } catch {
        // Model not at known location
    }
        // Check for model in workspace or global storage
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return null;
        
        const modelsDir = path.join(workspaceFolder.uri.fsPath, '.models');
        
        try {
            await fs.mkdir(modelsDir, { recursive: true });
            
            // Look for any .gguf file in the models directory
            const files = await fs.readdir(modelsDir);
            const ggufFile = files.find(f => f.endsWith('.gguf'));
            
            if (ggufFile) {
                console.log(`Found model: ${ggufFile}`);
                return path.join(modelsDir, ggufFile);
            }
            
            // If no model found, show instructions
            const download = await vscode.window.showInformationMessage(
                'No GGUF model found. Please download a model for code completion.',
                'Download Instructions'
            );
            
            if (download === 'Download Instructions') {
                vscode.window.showInformationMessage(
                    `Please download a GGUF model and place it in: ${modelsDir}\n\n` +
                    'Recommended models:\n' +
                    '1. DeepSeek Coder 1.3B: https://huggingface.co/TheBloke/deepseek-coder-1.3b-instruct-GGUF\n' +
                    '2. CodeLlama 7B: https://huggingface.co/TheBloke/CodeLlama-7B-GGUF\n' +
                    '3. StarCoder 3B: https://huggingface.co/TheBloke/starcoder-GGUF'
                );
            }
            
            return null;
        } catch (error) {
            console.error('Error ensuring model:', error);
            return null;
        }
    }
    
    private async startLlamaCppServer(): Promise<void> {
        if (this.isServerRunning) return;
        
        const platform = os.platform();
        let serverCommand = '';
        
        // Determine the llama.cpp server command based on platform
        if (platform === 'win32') {
            serverCommand = 'server.exe';
        } else if (platform === 'darwin') {
            serverCommand = './server';
        } else {
            serverCommand = './server';
        }
        
        // Build command arguments
        const args = [
            '-m', this.currentModel.path,
            '-c', this.currentModel.contextSize.toString(),
            '--port', '8080',
            '--host', '127.0.0.1',
            '-ngl', this.currentModel.useGpu ? '99' : '0', // GPU layers
            '--mlock', // Lock model in memory
            '--no-mmap', // Don't use memory mapping
            '-t', '4', // Number of threads
            '--ctx-size', this.currentModel.contextSize.toString(),
            '--verbose'
        ];
        
        try {
            // Try to find llama.cpp server executable
            const possiblePaths = [
                path.join(os.homedir(), 'llama.cpp', serverCommand),
                path.join(os.homedir(), '.local', 'bin', serverCommand),
                path.join('/usr', 'local', 'bin', serverCommand),
                serverCommand // Try PATH
            ];
            
            let serverPath = '';
            for (const p of possiblePaths) {
                try {
                    await fs.access(p);
                    serverPath = p;
                    break;
                } catch {
                    // Continue to next path
                }
            }
            
            if (!serverPath) {
                const install = await vscode.window.showErrorMessage(
                    'llama.cpp server not found. Please install llama.cpp first.',
                    'Installation Guide'
                );
                
                if (install === 'Installation Guide') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/ggerganov/llama.cpp#build'));
                }
                return;
            }
            
            console.log(`Starting llama.cpp server: ${serverPath} ${args.join(' ')}`);
            
            // Start the server
            this.llamaProcess = spawn(serverPath, args);
            
            this.llamaProcess.stdout.on('data', (data: Buffer) => {
                console.log(`llama.cpp: ${data.toString()}`);
            });
            
            this.llamaProcess.stderr.on('data', (data: Buffer) => {
                console.error(`llama.cpp error: ${data.toString()}`);
            });
            
            this.llamaProcess.on('close', (code: number) => {
                console.log(`llama.cpp server exited with code ${code}`);
                this.isServerRunning = false;
            });
            
            // Wait for server to be ready
            await this.waitForServer();
            
            this.isServerRunning = true;
            vscode.window.showInformationMessage('llama.cpp server started successfully!');
            
        } catch (error) {
            console.error('Failed to start llama.cpp server:', error);
            vscode.window.showErrorMessage('Failed to start llama.cpp server. Check the console for details.');
        }
    }
    
    private async waitForServer(maxAttempts = 30): Promise<boolean> {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${this.llamaEndpoint}/health`);
                if (response.ok) {
                    console.log('llama.cpp server is ready');
                    return true;
                }
            } catch {
                // Server not ready yet
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return false;
    }
    
    async generateCompletion(
        prompt: string,
        context: string,
        maxTokens: number = 150
    ): Promise<string> {
        console.log('🚀 generateCompletion called with llama.cpp');
        
        // First try pattern matching for instant completions
        // const quickCompletion = this.getQuickCompletion(prompt.trim());
        // if (quickCompletion) {
        //     console.log('Using quick pattern completion:', quickCompletion);
        //     return quickCompletion;
        // }
        
        // Check cache
        const cacheKey = prompt.trim().substring(prompt.length - 50);
        if (this.modelCache.has(cacheKey)) {
            console.log('Using cached completion');
            return this.modelCache.get(cacheKey) || '';
        }
        
        if (!this.isServerRunning) {
            console.log('Server not running, using fallback');
            return this.getFallbackCompletion(prompt);
        }
        
        try {
            const lines = prompt.split('\n');
            const currentLine = lines[lines.length - 1];
            const contextLines = lines.slice(-10, -1).join('\n');
            
            // Build FIM (Fill-In-Middle) prompt for code completion
            // Different models use different FIM tokens
            let fimPrompt = '';
            
            if (this.currentModel.name.includes('deepseek')) {
                // DeepSeek format
                fimPrompt = `${contextLines}
${currentLine}<｜fim▁hole｜>`;
            } else if (this.currentModel.name.includes('starcoder')) {
                // StarCoder format
                fimPrompt = `<fim_prefix>${contextLines}
${currentLine}<fim_suffix><fim_middle>`;
            } else if (this.currentModel.name.includes('codellama')) {
                // CodeLlama format
                fimPrompt = ` <PRE> ${contextLines}
${currentLine} <SUF> <MID>`;
            } else {
                // Generic format - just continue the code
                fimPrompt = `${contextLines}
${currentLine}`;
            }
            
            console.log('Requesting completion from llama.cpp...');
            const startTime = Date.now();
            
            const response = await fetch(`${this.llamaEndpoint}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: fimPrompt,
                    n_predict: 50, // Very short for inline completion
                    temperature: 0.2,
                    top_k: 40,
                    top_p: 0.95,
                    repeat_penalty: 1.1,
                    stop: [
                        "\n",
                        "<｜fim",
                        "```",
                        "\nfunction",
                        "\nclass",
                        "\nconst",
                        "\nlet",
                        "\nvar"
                    ],
                    cache_prompt: true, // Cache for faster subsequent completions
                    stream: false
                })
            });
            
            const responseTime = Date.now() - startTime;
            console.log('Response time:', responseTime, 'ms');
            
            if (!response.ok) {
                console.error('llama.cpp error:', response.status);
                return this.getFallbackCompletion(prompt);
            }
            
            const data = await response.json() as LlamaCppResponse;
            let completion = data.content?.trim() || '';
            
            console.log('Raw response:', completion);
            console.log('Tokens predicted:', data.tokens_predicted);
            console.log('Speed:', data.timings?.predicted_per_second, 'tokens/sec');
            
            // Clean the completion
            completion = this.cleanCompletion(completion, currentLine);
            
            if (!completion) {
                return this.getFallbackCompletion(prompt);
            }
            
            console.log('✅ Final completion:', completion);
            
            // Cache it
            this.modelCache.set(cacheKey, completion);
            if (this.modelCache.size > 100) {
                const firstKey = this.modelCache.keys().next().value;
                if (firstKey !== undefined) {
                    this.modelCache.delete(firstKey);
                }
            }
            
            return completion;
            
        } catch (error) {
            console.error('llama.cpp completion error:', error);
            return this.getFallbackCompletion(prompt);
        }
    }
    
    private cleanCompletion(completion: string, currentLine: string): string {
        // Remove FIM tokens
        completion = completion.replace(/<｜fim[^｜]*｜>/g, '');
        completion = completion.replace(/<fim_[^>]+>/g, '');
        completion = completion.replace(/<(PRE|SUF|MID)>/g, '');
        
        // Remove current line if repeated
        if (completion.startsWith(currentLine)) {
            completion = completion.substring(currentLine.length);
        }
        
        // Take only the actual code completion (first line usually)
        const lines = completion.split('\n');
        completion = lines[0].trim();
        
        // Limit length for inline completion
        if (completion.length > 50) {
            const breakPoints = [';', '{', ')', ']', ','];
            for (const point of breakPoints) {
                const idx = completion.indexOf(point);
                if (idx > 0 && idx <= 50) {
                    completion = completion.substring(0, idx + 1);
                    break;
                }
            }
            if (completion.length > 50) {
                completion = completion.substring(0, 50);
            }
        }
        
        return completion;
    }
    
    private getQuickCompletion(prompt: string): string {
        const trimmed = prompt.trim();
        const lastLine = trimmed.split('\n').pop() || '';
        
        // Function patterns
        if (lastLine.includes('factorial') && lastLine.includes('return 1;')) {
            return '\n  return n * factorial(n - 1);';
        }
        
        // After return statements
        if (lastLine.endsWith('return 1;')) return '\n  ';
        if (lastLine.endsWith('return 0;')) return '\n  ';
        if (lastLine.endsWith('return true;')) return '\n  ';
        if (lastLine.endsWith('return false;')) return '\n  ';
        
        // Common JS patterns
        if (lastLine.endsWith('const ')) return 'result = ';
        if (lastLine.endsWith('let ')) return 'value = ';
        if (lastLine.endsWith('function ')) return 'doSomething() {';
        if (lastLine.endsWith('if (')) return 'condition) {';
        if (lastLine.endsWith('for (')) return 'let i = 0; i < array.length; i++) {';
        if (lastLine.endsWith('while (')) return 'condition) {';
        if (lastLine.endsWith('return ')) return 'result;';
        if (lastLine.endsWith('console.')) return 'log();';
        if (lastLine.endsWith('Math.')) return 'floor();';
        
        // React/JSX patterns
        if (lastLine.endsWith('<')) return 'div>';
        if (lastLine.endsWith('</')) return 'div>';
        if (lastLine.endsWith('/>')) return '';
        
        // Brackets
        if (lastLine.endsWith('{')) return '\n  ';
        if (lastLine.endsWith('(')) return ')';
        if (lastLine.endsWith('[')) return ']';
        if (lastLine.endsWith('"')) return '"';
        if (lastLine.endsWith("'")) return "'";
        if (lastLine.endsWith('`')) return '`';
        if (lastLine.endsWith(';')) return '\n  ';
        
        return '';
    }
    
    private getFallbackCompletion(prompt: string): string {
        const lines = prompt.split('\n');
        const currentLine = lines[lines.length - 1];
        const trimmed = currentLine.trim();
        
        // Context-aware fallbacks
        if (prompt.includes('factorial') && currentLine.includes('return 1;')) {
            return '\n  return n * factorial(n - 1);';
        }
        
        if (trimmed.endsWith(';')) return '\n  ';
        if (trimmed.endsWith('=')) return ' ';
        if (trimmed.endsWith('.')) return '';
        if (trimmed.endsWith(',')) return ' ';
        
        return '';
    }
    
    async stopServer() {
        if (this.llamaProcess) {
            this.llamaProcess.kill();
            this.llamaProcess = null;
            this.isServerRunning = false;
            console.log('llama.cpp server stopped');
        }
    }
    
    // Keep compatibility with existing methods
    async checkModelStatus(): Promise<{ isReady: boolean; models: string[] }> {
        return {
            isReady: this.isServerRunning,
            models: this.currentModel.path ? [this.currentModel.name] : []
        };
    }
    
    async downloadModels(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ) {
        progress.report({ message: 'Please download GGUF models manually', increment: 100 });
    }
    
    async explainCode(code: string, context: string): Promise<string> {
        if (!this.isServerRunning) {
            return 'Server not running. Please start the llama.cpp server.';
        }
        
        const prompt = `Explain this JavaScript code clearly and concisely:

\`\`\`javascript
${code}
\`\`\`

Explanation:`;
        
        try {
            const response = await fetch(`${this.llamaEndpoint}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: 300,
                    temperature: 0.3,
                    top_k: 40,
                    top_p: 0.95,
                    stop: ["\n\n\n", "```", "\nCode:", "\nQuestion:"],
                    cache_prompt: false,
                    stream: false
                })
            });
            
            if (!response.ok) {
                return 'Failed to explain code';
            }
            
            const data = await response.json() as LlamaCppResponse;
            let explanation = data.content?.trim() || 'Unable to explain code';
            
            // Clean up the explanation
            explanation = explanation.replace(/^[\s\n]+/, '').replace(/[\s\n]+$/, '');
            
            return explanation;
        } catch (error) {
            console.error('Failed to explain code:', error);
            return 'Unable to explain code';
        }
    }
    
    async refactorCode(code: string, instruction: string, context: string): Promise<string> {
        if (!this.isServerRunning) {
            return code;
        }
        
        const prompt = `Refactor this JavaScript code according to the instruction.

Instruction: ${instruction}

Original code:
\`\`\`javascript
${code}
\`\`\`

Refactored code:
\`\`\`javascript`;
        
        try {
            const response = await fetch(`${this.llamaEndpoint}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: 500,
                    temperature: 0.2,
                    top_k: 30,
                    top_p: 0.9,
                    stop: ["```", "\n\n#", "\nOriginal", "\n\nInstruction"],
                    cache_prompt: false,
                    stream: false
                })
            });
            
            if (!response.ok) {
                return code;
            }
            
            const data = await response.json() as LlamaCppResponse;
            let refactored = data.content?.trim() || '';
            
            // Clean the response - remove any markdown or extra text
            refactored = refactored.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
            refactored = refactored.trim();
            
            return refactored || code;
        } catch (error) {
            console.error('Failed to refactor code:', error);
            return code;
        }
    }
    
    async generateTests(code: string, context: string): Promise<string> {
        if (!this.isServerRunning) {
            return '// Test generation not available';
        }
        
        const language = this.detectLanguage(code);
        const testFramework = this.getTestFramework(language);
        
        const prompt = `Generate comprehensive unit tests for this ${language} code using ${testFramework}.

Code to test:
\`\`\`${language}
${code}
\`\`\`

Unit tests:
\`\`\`${language}`;
        
        try {
            const response = await fetch(`${this.llamaEndpoint}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: 800,
                    temperature: 0.3,
                    top_k: 40,
                    top_p: 0.95,
                    stop: ["```", "\n\n#", "\n\nCode"],
                    cache_prompt: false,
                    stream: false
                })
            });
            
            if (!response.ok) {
                return '// Unable to generate tests';
            }
            
            const data = await response.json() as LlamaCppResponse;
            let tests = data.content?.trim() || '';
            
            // Clean the response
            tests = tests.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
            tests = tests.trim();
            
            if (!tests) {
                return '// Unable to generate tests';
            }
            
            // Add framework boilerplate if missing
            if (language === 'javascript' && !tests.includes('describe') && !tests.includes('test')) {
                tests = `// Tests for the provided function
const { expect } = require('chai');

${tests}`;
            }
            
            return tests;
        } catch (error) {
            console.error('Failed to generate tests:', error);
            return '// Unable to generate tests';
        }
    }

    // Add this method to your LocalAIProvider class (in LocalAIProvider.ts)
// Place it after the generateTests method

async chat(message: string, context: string): Promise<string> {
    if (!this.isServerRunning) {
        // Check if server is running
        try {
            const response = await fetch(`${this.llamaEndpoint}/health`);
            if (response.ok) {
                this.isServerRunning = true;
            } else {
                return "AI server is not running. Please ensure llama.cpp server is running at http://localhost:8080";
            }
        } catch (error) {
            return "Cannot connect to AI server. Please start llama.cpp server manually:\nD:\\llama.cpp\\llama-server.exe -m qwen-coder.gguf -c 4096 --port 8080";
        }
    }
    
    // Build a chat-style prompt
    const prompt = `You are a helpful AI coding assistant. Answer the user's question based on the context provided.

${context ? `Context:\n${context}\n` : ''}
User: ${message}
Assistant:`;
    
    try {
        console.log('Sending chat request to llama.cpp...');
        
        const response = await fetch(`${this.llamaEndpoint}/completion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                n_predict: 500,  // Reasonable length for chat responses
                temperature: 0.7,  // More creative for chat
                top_k: 40,
                top_p: 0.95,
                repeat_penalty: 1.1,
                stop: [
                    "\nUser:",
                    "\nHuman:",
                    "\n\n\n",
                    "```\n\n",
                    "\nAssistant:",
                    "<|endoftext|>"
                ],
                cache_prompt: false,
                stream: false
            })
        });
        
        if (!response.ok) {
            console.error('llama.cpp chat error:', response.status);
            return `Server error: ${response.status}. Please check if the llama.cpp server is running properly.`;
        }
        
        const data = await response.json() as any;
        let chatResponse = data.content?.trim() || '';
        
        if (!chatResponse) {
            return "I couldn't generate a response. Please try again.";
        }
        
        // Clean up the response
        chatResponse = chatResponse.replace(/^(Assistant:|AI:)\s*/i, '');
        chatResponse = chatResponse.replace(/\n(User:|Human:).*$/s, '');
        chatResponse = chatResponse.trim();
        
        console.log('Chat response received:', chatResponse);
        
        return chatResponse;
        
    } catch (error) {
        console.error('Chat error:', error);
        return `Error connecting to AI: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the llama.cpp server is running.`;
    }
}
    
    async generateEmbedding(text: string): Promise<number[]> {
        // Not implemented for llama.cpp yet
        return [];
    }
    
    async streamChat(
        message: string,
        context: string,
        onToken: (token: string) => void
    ): Promise<void> {
        // Not implemented for llama.cpp yet
    }
    
    async getAvailableModels(): Promise<string[]> {
        return this.currentModel.path ? [this.currentModel.name] : [];
    }
    
    async switchModel(modelName: string) {
        // Would need to restart server with new model
        console.log('Model switching not implemented for llama.cpp');
    }

    private detectLanguage(code: string): string {
        // Simple language detection based on syntax
        if (code.includes('def ') || code.includes('import ')) return 'python';
        if (code.includes('function') || code.includes('const ')) return 'javascript';
        if (code.includes('public class') || code.includes('private ')) return 'java';
        if (code.includes('fn ') || code.includes('let mut')) return 'rust';
        if (code.includes('package main') || code.includes('func ')) return 'go';
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