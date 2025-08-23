import * as vscode from 'vscode';
import { LocalAIProvider } from './LocalAIProvider';
import { CodeIndexer } from '../indexer/CodeIndexer';
import { PrivacyGuard } from '../security/PrivacyGuard';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private context: vscode.ExtensionContext,
        private localAI: LocalAIProvider,
        private indexer: CodeIndexer,
        private privacyGuard: PrivacyGuard
    ) {}
    
    resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            enableScripts: true
        };
        
        webviewView.webview.html = this.getHtmlContent();
    }
    
    addMessage(type: string, input: string, response: string) {
        console.log('Chat:', type, input, response);
    }
    
    private getHtmlContent(): string {
        return `
            <!DOCTYPE html>
            <html>
            <body>
                <h2>Local AI Chat</h2>
                <p>Chat interface coming soon!</p>
            </body>
            </html>
        `;
    }
}