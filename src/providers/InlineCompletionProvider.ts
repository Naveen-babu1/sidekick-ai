// providers/InlineCompletionProvider.ts
import * as vscode from 'vscode';
import { LocalAIProvider } from './LocalAIProvider';
import { CodeIndexer } from '../indexer/CodeIndexer';
import { PrivacyGuard } from '../security/PrivacyGuard';

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimer: NodeJS.Timeout | undefined;
    private lastCompletionPosition: vscode.Position | undefined;
    
    constructor(
        private localAI: LocalAIProvider,
        private indexer: CodeIndexer,
        private privacyGuard: PrivacyGuard
    ) {}
    
    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[]> {
        
        // Don't trigger on every keystroke
        if (this.shouldSkipCompletion(document, position, context)) {
            return [];
        }
        
        // Get current line and context
        const linePrefix = document.lineAt(position.line).text.substring(0, position.character);
        
        // Skip if line is too short
        if (linePrefix.trim().length < 3) {
            return [];
        }
        
        // Sanitize code before processing
        const sanitizedContext = await this.privacyGuard.sanitizeCode(
            this.getDocumentContext(document, position)
        );
        
        // Get relevant context from indexed files
        const semanticContext = await this.indexer.getRelevantContext(
            document.uri,
            position,
            500  // max tokens
        );
        
        // Generate completion
        const completion = await this.localAI.generateCompletion(
            linePrefix,
            `${sanitizedContext}\n\n${semanticContext}`,
            100
        );
        
        if (!completion || token.isCancellationRequested) {
            return [];
        }
        
        // Record for privacy tracking
        this.privacyGuard.recordLocalInference('completion', completion.length);
        
        return [{
            insertText: completion,
            range: new vscode.Range(position, position)
        }];
    }
    
    private shouldSkipCompletion(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext
    ): boolean {
        // Skip if in comment or string
        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.substring(0, position.character);
        
        if (this.isInComment(beforeCursor) || this.isInString(beforeCursor)) {
            return true;
        }
        
        // Skip if just typed a space or newline
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
            const lastChar = beforeCursor[beforeCursor.length - 1];
            if (lastChar === ' ' || lastChar === '\n') {
                return true;
            }
        }
        
        return false;
    }
    
    private isInComment(text: string): boolean {
        // Simple heuristic for common comment patterns
        return text.includes('//') || text.includes('#') || text.includes('/*');
    }
    
    private isInString(text: string): boolean {
        // Count quotes to determine if we're in a string
        const singleQuotes = (text.match(/'/g) || []).length;
        const doubleQuotes = (text.match(/"/g) || []).length;
        return singleQuotes % 2 === 1 || doubleQuotes % 2 === 1;
    }
    
    private getDocumentContext(document: vscode.TextDocument, position: vscode.Position): string {
        const startLine = Math.max(0, position.line - 50);
        const endLine = Math.min(document.lineCount - 1, position.line + 10);
        
        const lines = [];
        for (let i = startLine; i <= endLine; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines.join('\n');
    }
}