#!/bin/bash

echo "LSP MCP Server Setup Script"
echo "=========================="
echo ""

# Check if npm is installed
if ! which npm >/dev/null 2>&1; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "1. Installing npm dependencies..."
npm install

echo ""
echo "2. Building the server..."
npm run build

echo ""
echo "3. Checking for language servers..."
echo ""

# Function to check if a command exists in PATH or common locations
check_language_server() {
    local cmd=$1
    local name=$2
    local install_msg=$3
    local found=0
    local location=""
    
    # First check in PATH
    if which "$cmd" >/dev/null 2>&1; then
        location=$(which "$cmd")
        found=1
    else
        # Check common installation directories
        for dir in /usr/local/bin /usr/bin ~/.local/bin ~/go/bin ~/.cargo/bin ~/.npm/bin /opt/homebrew/bin ~/.nvm/versions/node/*/bin; do
            if [ -f "$dir/$cmd" ] && [ -x "$dir/$cmd" ]; then
                location="$dir/$cmd"
                found=1
                break
            fi
        done
    fi
    
    if [ $found -eq 1 ]; then
        echo "✓ $name found at: $location"
    else
        echo "✗ $name not found"
        echo "  $install_msg"
    fi
}

# Check for TypeScript language server
check_language_server "typescript-language-server" \
    "TypeScript language server" \
    "Install with: npm install -g typescript-language-server typescript"

# Check for Python language server
check_language_server "pylsp" \
    "Python language server" \
    "Install with: pip install python-lsp-server"

# Check for Rust analyzer
check_language_server "rust-analyzer" \
    "Rust analyzer" \
    "Install with: rustup component add rust-analyzer"

# Check for gopls
check_language_server "gopls" \
    "Go language server (gopls)" \
    "Install with: go install golang.org/x/tools/gopls@latest"

# Check for clangd
check_language_server "clangd" \
    "C/C++ language server (clangd)" \
    "Install from your package manager or LLVM releases"

# Check for Java language server
check_language_server "jdtls" \
    "Java language server (jdtls)" \
    "Install from Eclipse JDT Language Server releases"

echo ""
echo "4. Setup complete!"
echo ""
echo "To add this server to your MCP configuration, add the following to your MCP settings:"
echo ""
echo "{"
echo "  \"mcpServers\": {"
echo "    \"lsp\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"$(pwd)/build/index.js\"]"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "You can test the server by running:"
echo "node examples/test-basic.js"
echo ""
echo "For a full test with language servers:"
echo "node examples/test-lsp-server.js"
echo ""
echo "To check your environment in detail:"
echo "./check-environment.sh"