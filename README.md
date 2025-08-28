# Sidekick AI - Your Private AI Coding Assistant

🚀 **AI-powered coding, 100% offline.** No cloud, no subscriptions, no data mining. Just pure, local AI assistance.

![Version](https://img.shields.io/visual-studio-marketplace/v/NaveenBabu.sidekick-ai)
![Installs](https://img.shields.io/visual-studio-marketplace/i/NaveenBabu.sidekick-ai)
![Rating](https://img.shields.io/visual-studio-marketplace/r/NaveenBabu.sidekick-ai)

## ✨ Why Sidekick AI?

Unlike cloud-based AI assistants, Sidekick AI runs **entirely on your machine**. Your code never leaves your computer. Perfect for:
- 🔒 **Enterprise environments** with strict security policies
- 💼 **Proprietary codebases** that can't use cloud services
- 🌍 **Offline development** without internet dependency
- 🛡️ **Privacy-conscious developers** who value data ownership

## 🎯 Core Features

### 🤖 Smart Code Fixes
See an error? Click the lightbulb and let AI fix it. Sidekick analyzes your entire file context to provide intelligent fixes, not just simple corrections.

### 💬 Interactive AI Chat
Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac) to open a GitHub Copilot-style chat panel. Ask questions, get explanations, or request code improvements.

### 🔍 Instant Code Explanations
Select any code and press `Alt+E` (`Option+E` on Mac) to get a clear explanation. Perfect for understanding complex algorithms or unfamiliar codebases.

### 🔧 Intelligent Refactoring
Right-click selected code and choose "Refactor Code" to get AI-powered improvements. From performance optimizations to readability enhancements.

### 🧪 Automatic Test Generation
Generate comprehensive unit tests for your functions with a single click. Supports multiple testing frameworks.

### ⚡ Fast Inline Completions
Get intelligent code suggestions as you type. Trained on modern coding patterns, it understands your intent and provides relevant completions.

## 🚀 Quick Start (2 minutes)

### Step 1: Install llama.cpp
**Windows:** 
```bash
# Download from GitHub releases
https://github.com/ggerganov/llama.cpp/releases
```

**Mac:**
```bash
brew install llama.cpp
```

**Linux:**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && make
```

### Step 2: Get a Model
Download our recommended model (1.5GB):
[Qwen 2.5 Coder - Optimized for code](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf)

### Step 3: That's It!
Install Sidekick AI and it will:
- ✅ Auto-detect llama.cpp
- ✅ Guide you through model selection
- ✅ Start the AI server automatically
- ✅ Remember your settings

## 📊 Performance

- **Response time:** ~500ms for completions
- **RAM usage:** 2-4GB depending on model
- **CPU only:** No GPU required
- **Token speed:** 20-30 tokens/second on modern CPUs

## 🔒 Privacy Guarantee

```json
{
  "telemetry": "NONE",
  "data_collection": "ZERO",
  "cloud_services": "DISABLED",
  "network_requests": "BLOCKED",
  "your_code": "STAYS_LOCAL"
}
```

## 🛠️ Configuration

Access settings with `Ctrl+,` and search "sidekick-ai":

```json
{
  "sidekick-ai.modelPath": "path/to/your/model.gguf",
  "sidekick-ai.llamaPath": "auto-detected",
  "sidekick-ai.contextSize": 4096,
  "sidekick-ai.temperature": 0.7,
  "sidekick-ai.port": 8080
}
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "AI server not running" | Ensure llama.cpp is installed and in PATH |
| "Model not found" | Check model path in settings |
| "Slow responses" | Use quantized models (Q4_K_M recommended) |
| "No completions" | Enable inline suggestions in VS Code settings |

## 💡 Pro Tips

1. **Faster responses:** Use smaller context windows (2048) for quick completions
2. **Better quality:** Try 7B models if you have 8GB+ RAM
3. **Offline setup:** Download multiple models for different tasks
4. **Custom models:** Any GGUF format model works!

## 📈 Roadmap

- [ ] Streaming responses
- [ ] Multiple model support
- [ ] Custom prompt templates
- [ ] Project-wide refactoring
- [ ] Code documentation generation
- [ ] Git commit message generation

## 📜 License

Use it, modify it, share it freely!

**Built with ❤️ for developers who value privacy and local-first AI**

*No account required. No API keys. No subscriptions. Just install and code.*
