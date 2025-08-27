import * as vscode from "vscode";
import { LocalAIProvider } from "./LocalAIProvider";

export class CodeFixHandler {
  constructor(
    private localAI: LocalAIProvider,
    private context: vscode.ExtensionContext
  ) {}

  async fixError(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) {
      return;
    }

    // Get FULL file context
    const fullFileContent = document.getText();
    const errorText = document.getText(diagnostic.range);
    const errorLine = diagnostic.range.start.line;
    
    // Prepare prompt for AI
    const prompt = `Fix this ${document.languageId} code error:

Error message: ${diagnostic.message}
Error location: Line ${errorLine + 1}
Error text: "${errorText}"

Code context:
\`\`\`${document.languageId}
${fullFileContent}
\`\`\`

Analyze the entire file context and provide ONLY the fixed code that should replace "${errorText}". Do not include explanations, just the corrected code:`;

    try {
      // Show progress
      const fix = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing error with full context...",
          cancellable: false,
        },
        async () => {
          // Ensure server is running
          if (!(await this.localAI.checkModelStatus().then((s) => s.isReady))) {
            await this.localAI.ensureServerRunning();
          }

          // Get AI fix
          const response = await this.localAI.chat(prompt, fullFileContent);

          // Clean the response
          let fixedCode = response
            .replace(/```[a-z]*\n?/g, "")
            .replace(/```$/g, "")
            .trim();

          return fixedCode;
        }
      );

      if (!fix) {
        vscode.window.showErrorMessage("Could not generate fix");
        return;
      }

      // Create a preview panel to show the fix
      this.showFixPreview(editor, diagnostic.range, fix, errorText);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fix: ${error}`);
    }
  }

  private showFixPreview(
    editor: vscode.TextEditor,
    errorRange: vscode.Range,
    fixedCode: string,
    originalCode: string
  ) {
    // Store document URI to get fresh editor later
    const documentUri = editor.document.uri;
    // Create a webview panel to show the fix preview
    const panel = vscode.window.createWebviewPanel(
      "sidekickFix",
      "AI Code Fix",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
      }
    );

    panel.webview.html = this.getFixPreviewHtml(originalCode, fixedCode);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async message => {
            switch (message.command) {
                case 'accept':
                    // Get FRESH editor reference
                    const currentEditor = vscode.window.visibleTextEditors.find(
                        e => e.document.uri.toString() === documentUri.toString()
                    );
                    
                    if (!currentEditor) {
                        vscode.window.showErrorMessage('Original editor not found');
                        panel.dispose();
                        return;
                    }
                    
                    // Apply fix to the specific range
                    const success = await currentEditor.edit(editBuilder => {
                        editBuilder.replace(errorRange, fixedCode);
                    });
                    
                    if (success) {
                        vscode.window.showInformationMessage('Fix applied!');
                    } else {
                        vscode.window.showErrorMessage('Failed to apply fix');
                    }
                    
                    panel.dispose();
                    break;
                    
                case 'reject':
                    panel.dispose();
                    break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private getFixPreviewHtml(original: string, fixed: string): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 20px;
                    color: var(--vscode-foreground);
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .code-block {
                    background: var(--vscode-textCodeBlock-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 15px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                    overflow-x: auto;
                }
                .original {
                    background: rgba(255, 0, 0, 0.1);
                }
                .fixed {
                    background: rgba(0, 255, 0, 0.1);
                }
                .label {
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    padding: 20px;
                }
                button {
                    padding: 8px 20px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                }
                .accept {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .accept:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .reject {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                h2 {
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h2>🤖 AI Suggested Fix</h2>
            <div class="container">
                <div>
                    <div class="label">❌ Original (with error):</div>
                    <pre class="code-block original">${this.escapeHtml(
                      original
                    )}</pre>
                </div>
                <div>
                    <div class="label">✅ Fixed:</div>
                    <pre class="code-block fixed">${this.escapeHtml(
                      fixed
                    )}</pre>
                </div>
            </div>
            <div class="actions">
                <button class="accept" onclick="acceptFix()">Accept Fix</button>
                <button class="reject" onclick="rejectFix()">Close</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                
                function acceptFix() {
                    vscode.postMessage({ command: 'accept' });
                }
                
                function rejectFix() {
                    vscode.postMessage({ command: 'reject' });
                }
            </script>
        </body>
        </html>`;
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
