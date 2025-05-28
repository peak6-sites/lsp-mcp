#!/bin/bash

echo "LSP MCP Server Environment Check"
echo "================================"
echo ""

echo "System Information:"
echo "- OS: $(uname -s)"
echo "- Shell: $SHELL"
echo "- PATH: $PATH"
echo ""

echo "Node.js Environment:"
echo "- Node version: $(node --version 2>/dev/null || echo 'Not found')"
echo "- NPM version: $(npm --version 2>/dev/null || echo 'Not found')"
echo ""

echo "Language Server Detection:"
echo ""

# Function to thoroughly check for a command
check_language_server() {
    local cmd=$1
    local name=$2
    
    echo "Checking for $name ($cmd):"
    
    # Check with which
    if which "$cmd" >/dev/null 2>&1; then
        echo "  ✓ Found with 'which': $(which "$cmd")"
    else
        echo "  ✗ Not found with 'which'"
    fi
    
    # Check with command -v
    if command -v "$cmd" >/dev/null 2>&1; then
        echo "  ✓ Found with 'command -v': $(command -v "$cmd")"
    else
        echo "  ✗ Not found with 'command -v'"
    fi
    
    # Check with type
    if type "$cmd" >/dev/null 2>&1; then
        echo "  ✓ Found with 'type': $(type -p "$cmd")"
    else
        echo "  ✗ Not found with 'type'"
    fi
    
    # Try to run it
    if $cmd --version >/dev/null 2>&1; then
        echo "  ✓ Executable and responds to --version"
    elif $cmd --help >/dev/null 2>&1; then
        echo "  ✓ Executable and responds to --help"
    else
        echo "  ✗ Not executable or doesn't respond to --version/--help"
    fi
    
    echo ""
}

# Check each language server
check_language_server "typescript-language-server" "TypeScript Language Server"
check_language_server "pylsp" "Python Language Server"
check_language_server "rust-analyzer" "Rust Analyzer"
check_language_server "gopls" "Go Language Server"
check_language_server "clangd" "Clang Language Server"
check_language_server "jdtls" "Java Language Server"

echo "Additional Checks:"
echo ""

# Check for common installation locations
echo "Common language server locations:"
for dir in /usr/local/bin /usr/bin ~/.local/bin ~/go/bin ~/.cargo/bin ~/.npm/bin /opt/homebrew/bin; do
    if [ -d "$dir" ]; then
        echo "  Checking $dir:"
        for server in typescript-language-server pylsp rust-analyzer gopls clangd jdtls; do
            if [ -f "$dir/$server" ]; then
                echo "    ✓ Found $server"
            fi
        done
    fi
done

echo ""
echo "Environment check complete!"