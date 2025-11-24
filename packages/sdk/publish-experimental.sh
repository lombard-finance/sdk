#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Publishing to @lombard.experimental/sdk...${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
CURRENT_NAME=$(node -p "require('./package.json').name")

echo -e "${BLUE}📦 Current package: ${CURRENT_NAME}@${CURRENT_VERSION}${NC}"
echo ""

# Build FIRST (before changing package name)
echo "🔨 Building package..."
cd ../..
yarn workspace @lombard.finance/sdk build
cd packages/sdk

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Backup package.json
echo "📋 Creating backup..."
cp package.json package.json.backup

# Update package name and dependencies to @lombard.experimental
echo "✏️  Updating package name and dependencies to @lombard.experimental..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update package name
pkg.name = '@lombard.experimental/sdk';

// Update dependencies: @lombard.finance/* → @lombard.experimental/*
if (pkg.dependencies) {
  const deps = {};
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    if (name.startsWith('@lombard.finance/')) {
      const newName = name.replace('@lombard.finance/', '@lombard.experimental/');
      deps[newName] = version;
      console.log('  ✓ Updated dependency: ' + name + ' → ' + newName);
    } else {
      deps[name] = version;
    }
  }
  pkg.dependencies = deps;
}

// Update peerDependencies if any
if (pkg.peerDependencies) {
  const peerDeps = {};
  for (const [name, version] of Object.entries(pkg.peerDependencies)) {
    if (name.startsWith('@lombard.finance/')) {
      const newName = name.replace('@lombard.finance/', '@lombard.experimental/');
      peerDeps[newName] = version;
      console.log('  ✓ Updated peerDependency: ' + name + ' → ' + newName);
    } else {
      peerDeps[name] = version;
    }
  }
  pkg.peerDependencies = peerDeps;
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo -e "${GREEN}✅ Package name and dependencies updated${NC}"
echo ""

# Publish to npm
echo "📤 Publishing to npm..."
echo -e "${YELLOW}Publishing: @lombard.experimental/sdk@${CURRENT_VERSION}${NC}"
echo ""
npm publish

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Publish failed!${NC}"
    echo "📋 Restoring package.json..."
    mv package.json.backup package.json
    exit 1
fi

echo -e "${GREEN}✅ Publish successful!${NC}"
echo ""

# Restore original package.json
echo "📋 Restoring package.json..."
mv package.json.backup package.json

echo -e "${GREEN}✅ Restored package.json${NC}"
echo ""
echo -e "${BLUE}🎉 Successfully published @lombard.experimental/sdk@${CURRENT_VERSION}${NC}"
echo ""
echo -e "${YELLOW}📝 To install:${NC}"
echo -e "  npm install @lombard.experimental/sdk@${CURRENT_VERSION}"
echo ""


