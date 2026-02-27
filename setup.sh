#!/bin/bash
# AgentFlow - One-command setup & start script
# Run this in your terminal: bash setup.sh

set -e
echo ""
echo "⚡ AgentFlow — AI Workflow Visualizer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Claude Code
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code CLI not found. Please install it first."
    echo "   Visit: https://docs.anthropic.com/en/docs/claude-code"
    exit 1
fi
echo "✅ Claude Code CLI found"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install it first."
    exit 1
fi
echo "✅ Node.js $(node -v) found"

# Fix npm cache permissions if needed
if [ -d "$HOME/.npm" ]; then
    echo "🔧 Fixing npm cache permissions..."
    sudo chown -R $(id -u):$(id -g) "$HOME/.npm" 2>/dev/null || true
fi

# Clean up any broken node_modules
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning old node_modules..."
    rm -rf node_modules 2>/dev/null || sudo rm -rf node_modules 2>/dev/null || true
fi

# Remove old lock file
rm -f package-lock.json 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "To start AgentFlow, run:"
echo ""
echo "  bash start.sh"
echo ""
