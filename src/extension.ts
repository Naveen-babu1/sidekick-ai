import * as vscode from "vscode";
import { LocalAIProvider } from "./providers/LocalAIProvider";
import { CodeIndexer } from "./indexer/CodeIndexer";
import { PrivacyGuard } from "./security/PrivacyGuard";
import { InlineCompletionProvider } from "./providers/InlineCompletionProvider";
import { ChatViewProvider } from "./providers/ChatViewProvider";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Privacy-First Copilot is starting...");

  // Initialize privacy guard
  const privacyGuard = new PrivacyGuard();
  await privacyGuard.initialize();

  // Check for local model availability
  const localAI = new LocalAIProvider(context);
  const modelStatus = await localAI.checkModelStatus();

  if (!modelStatus.isReady) {
    const download = await vscode.window.showInformationMessage(
      "No local AI models found. Would you like to download them now? (Required for offline operation)",
      "Download Models",
      "Later"
    );

    if (download === "Download Models") {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Downloading AI Models",
          cancellable: true,
        },
        async (progress, token) => {
          await localAI.downloadModels(progress, token);
        }
      );
    }
  }

  // Initialize code indexer for context awareness
  const indexer = new CodeIndexer(context);
  await indexer.indexWorkspace();

  // Register inline completion provider
  const inlineProvider = new InlineCompletionProvider(
    localAI,
    indexer,
    privacyGuard
  );
  const inlineDisposable =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**/*" },
      inlineProvider
    );

  // Register chat sidebar
  const chatProvider = new ChatViewProvider(
    context,
    localAI,
    indexer,
    privacyGuard
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("sidekick-ai-chat", chatProvider)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("sidekick-ai.explain", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
      vscode.window.showInformationMessage("Please select code to explain");
      return;
    }

      // Show loading indicator
    const loadingDecoration = vscode.window.createTextEditorDecorationType({
        after: {
          contentText: '  🔄 Getting AI explanation...',
          color: 'rgba(255, 255, 255, 0.5)',
          fontStyle: 'italic'
        }
      });
      
      editor.setDecorations(loadingDecoration, [{
        range: new vscode.Range(selection.end, selection.end)
      }]);
  
      // Get explanation
      const explanation = await localAI.explainCode(
        selectedText,
        indexer.getContext()
      );
  
      // Clear loading
      editor.setDecorations(loadingDecoration, []);
      loadingDecoration.dispose();
  
      // Create inline explanation decoration
      const explanationDecoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: false,
        after: {
          contentText: '',  // We'll use hover for full text
          textDecoration: 'none'
        },
        // Highlight the selected code
        backgroundColor: 'rgba(65, 105, 225, 0.1)',
        border: '1px solid rgba(65, 105, 225, 0.3)',
        borderRadius: '3px'
      });
  
      // Create rich hover content
      const hoverMessage = new vscode.MarkdownString('', true);
      hoverMessage.isTrusted = true;
      hoverMessage.supportHtml = true;
      
      // Format explanation nicely
      hoverMessage.appendMarkdown(`
  <div style="padding: 10px; max-width: 600px;">
  
  ### 🤖 AI Explanation
  
  ${explanation}
  
  ---
  *💡 Tip: Select any code and use Ctrl+Shift+E for explanations*
  
  </div>
      `);
  
      // Apply decoration with hover
      const decoration: vscode.DecorationOptions = {
        range: selection,
        hoverMessage: hoverMessage,
        renderOptions: {
          after: {
            contentText: ` // AI: ${explanation.split('\n')[0].substring(0, 50)}...`,
            color: 'rgba(106, 153, 85, 0.6)',
            fontStyle: 'italic',
            margin: '0 0 0 10px'
          }
        }
      };
  
      editor.setDecorations(explanationDecoration, [decoration]);
  
      // Auto-clear after 30 seconds
      setTimeout(() => {
        editor.setDecorations(explanationDecoration, []);
        explanationDecoration.dispose();
      }, 30000);
  
      // Show notification
      vscode.window.showInformationMessage(
        'AI explanation added inline. Hover to see full explanation.',
        'Clear'
      ).then(action => {
        if (action === 'Clear') {
          editor.setDecorations(explanationDecoration, []);
          explanationDecoration.dispose();
        }
      });
  
      // Still add to chat
      chatProvider.addMessage("explain", selectedText, explanation);
    }),

    vscode.commands.registerCommand("sidekick-ai.refactor", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.document.getText(editor.selection);
      const instruction = await vscode.window.showInputBox({
        prompt: "How would you like to refactor this code?",
        // placeholder: 'e.g., Extract to function, Add error handling, Optimize performance'
      });

      if (!instruction) return;

      const refactored = await localAI.refactorCode(
        selection,
        instruction,
        indexer.getContext()
      );

      // Apply edit
      editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, refactored);
      });
    }),

    vscode.commands.registerCommand("sidekick-ai.generateTests", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const code = editor.document.getText();
      const tests = await localAI.generateTests(code, indexer.getContext());

      // Create new file with tests
      const testDoc = await vscode.workspace.openTextDocument({
        content: tests,
        language: editor.document.languageId,
      });
      await vscode.window.showTextDocument(testDoc);
    }),

    vscode.commands.registerCommand("sidekick-ai.privacyStatus", async () => {
      const report = privacyGuard.getPrivacyReport();
      const panel = vscode.window.createWebviewPanel(
        "privacyReport",
        "Privacy Status",
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = getPrivacyReportHtml(report);
    }),

    vscode.commands.registerCommand("sidekick-ai.switchModel", async () => {
      const models = await localAI.getAvailableModels();
      const selected = await vscode.window.showQuickPick(models, {
        placeHolder: "Select AI model to use",
      });

      if (selected) {
        await localAI.switchModel(selected);
        vscode.window.showInformationMessage(`Switched to ${selected}`);
      }
    })
  );
  // Add hover provider for automatic explanations
const hoverProvider = vscode.languages.registerHoverProvider(
    { pattern: '**/*' },
    {
      async provideHover(document, position, token) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        
        const selection = editor.selection;
        
        // Only show if hovering over selected text
        if (selection.isEmpty || !selection.contains(position)) {
          return;
        }
        
        const selectedText = document.getText(selection);
        
        // Get cached explanation or generate new one
        const explanation = await localAI.explainCode(
          selectedText,
          indexer.getContext()
        );
        
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.supportHtml = true;
        markdown.appendMarkdown(`### 🤖 AI Explanation\n\n${explanation}`);
        
        return new vscode.Hover(markdown, selection);
      }
    }
  );
  
  context.subscriptions.push(hoverProvider);

  // Register status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(shield) Privacy Mode: ON";
  statusBarItem.tooltip =
    "All AI processing happens locally. Click for privacy report.";
  statusBarItem.command = "sidekick-ai.privacyStatus";
  statusBarItem.show();

  context.subscriptions.push(inlineDisposable, statusBarItem);

  // Watch for workspace changes
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  watcher.onDidCreate((uri) => indexer.indexFile(uri));
  watcher.onDidChange((uri) => indexer.updateFile(uri));
  watcher.onDidDelete((uri) => indexer.removeFile(uri));

  context.subscriptions.push(watcher);

  vscode.window.showInformationMessage(
    "Privacy-First Copilot: Ready (100% Local Processing)"
  );
}

function getPrivacyReportHtml(report: any): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; }
                .status { color: #4CAF50; font-weight: bold; }
                .metric { margin: 10px 0; padding: 10px; background: var(--vscode-editor-background); }
                h2 { color: var(--vscode-foreground); }
            </style>
        </head>
        <body>
            <h1>🔒 Privacy Status Report</h1>
            <div class="status">✓ All processing is local</div>
            
            <h2>Session Statistics</h2>
            <div class="metric">Network Requests Blocked: ${
              report.blockedRequests
            }</div>
            <div class="metric">Local Inferences: ${
              report.localInferences
            }</div>
            <div class="metric">Data Processed Locally: ${
              report.dataProcessed
            }</div>
            <div class="metric">Active Model: ${report.activeModel}</div>
            
            <h2>Security Settings</h2>
            <div class="metric">Telemetry: DISABLED</div>
            <div class="metric">External APIs: BLOCKED</div>
            <div class="metric">Code Sanitization: ENABLED</div>
            <div class="metric">Local Models Only: ENFORCED</div>
            
            <h2>Indexed Files</h2>
            <div class="metric">Total Files: ${report.indexedFiles}</div>
            <div class="metric">Excluded Patterns: ${report.excludedPatterns.join(
              ", "
            )}</div>
        </body>
        </html>
    `;
}

export function deactivate() {
  console.log("Privacy-First Copilot deactivated");
}
