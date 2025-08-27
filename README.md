# Sidekick AI - Local AI Coding Assistant

100% local AI-powered coding assistant for VS Code. No internet required, no data leaves your machine.

## Features

- ✅ **Code Completion** - Intelligent inline suggestions
- ✅ **Code Explanation** - Understand complex code instantly
- ✅ **Code Refactoring** - AI-powered improvements
- ✅ **Test Generation** - Automatic unit tests
- ✅ **Chat Interface** - Interactive AI assistant
- ✅ **100% Local** - Runs entirely on your machine
- ✅ **Privacy-First** - No telemetry, no data collection

## Requirements

- VS Code 1.74.0 or higher
- llama.cpp installed locally
- 4GB+ RAM
- A GGUF model file (instructions provided)

## Setup

1. Install llama.cpp:
   - Windows: Download from [releases](https://github.com/ggerganov/llama.cpp/releases)
   - Mac/Linux: `brew install llama.cpp` or build from source

2. Download a model:
   - [Recommended: Qwen 2.5 Coder 1.5B](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf)
   - Save it anywhere on your computer

3. Start the server:
   llama-server.exe -m qwen-coder.gguf -c 4096 --port 8080

4. Configure Extension
   - Install the extension
   - When prompted, select your model file
   - Extension will auto-detect llama.cpp

## Troubleshooting

- **"AI server not running"**: Check that llama.cpp is installed
- **"Model not found"**: Press Ctrl+, and set the model path in settings
- **Slow responses**: Ensure you're using a quantized model (Q4_K_M or Q5_K_M)

## Usage

- Press `Ctrl+Shift+A` to open chat
- Select code and press `Alt+E` to explain
- Right-click for AI options
- Type `/help` in chat for commands

## Privacy

This extension runs 100% locally:
- No internet connection required
- No data sent to external servers
- No telemetry or usage tracking
- All processing on your machine

## License

MIT
```