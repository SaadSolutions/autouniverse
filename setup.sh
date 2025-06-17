#!/bin/bash

# Auto Universe Inc. Development Setup Script
echo "🚗 Auto Universe Inc. - Setting up development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (Tailwind CSS only)..."
    npm install
fi

# Build Tailwind CSS for production
echo "🎨 Building Tailwind CSS..."
npm run build

# Check if build was successful
if [ -f "public/css/tailwind.css" ] && [ -s "public/css/tailwind.css" ]; then
    echo "✅ Tailwind CSS built successfully!"
    echo "📁 Generated: public/css/tailwind.css"
else
    echo "❌ Error: Tailwind CSS build failed"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Your Auto Universe Inc. website is ready."
echo ""
echo "📚 Available commands:"
echo "  npm run build      - Build CSS for production"
echo "  npm run build-css  - Build CSS with watch mode for development"
echo ""
echo "🌐 To start development:"
echo "  npm run build-css  (then open HTML files in your browser)"
echo ""
echo "🔒 Security: Using minimal dependencies - only Tailwind CSS!"
echo "   Total packages: ~113 (vs 348+ with development servers)"
echo ""
