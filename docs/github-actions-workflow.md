# @thepia/branding GitHub Actions Workflow

## 🎯 **Overview**

This document explains how the GitHub Actions workflow works specifically for the @thepia/branding repository, including build, test, and publish automation.

## 🏗️ **Workflow Architecture**

### **Two-Workflow System**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   ci.yml    │───▶│  Git Tag     │───▶│   publish.yml   │
│ Test + Tag  │    │  (v1.1.0)    │    │ Build + Publish │
└─────────────┘    └──────────────┘    └─────────────────┘
```

## 📋 **Workflow 1: CI with Auto-Tagging (`.github/workflows/ci.yml`)**

### **Triggers**
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### **Jobs**

**1. Test Job**
- Runs on all pushes and PRs
- Tests all branding token generation
- Validates CSS output
- Runs regression tests

**2. Tag Job (Main Branch Only)**
- Only runs on pushes to main branch
- Checks if `package.json` version changed
- Creates git tag if new version detected
- Triggers publish workflow

### **Key Steps**
```yaml
# Version detection
CURRENT_VERSION=$(node -p "require('./package.json').version")
if git tag -l "v$CURRENT_VERSION" | grep -q "v$CURRENT_VERSION"; then
  echo "should_tag=false" >> $GITHUB_OUTPUT
else
  echo "should_tag=true" >> $GITHUB_OUTPUT
fi

# Tag creation
git tag -a "v${{ steps.version-check.outputs.version }}" -m "Release v${{ steps.version-check.outputs.version }}"
git push origin "v${{ steps.version-check.outputs.version }}"
```

## 📦 **Workflow 2: Tag-Triggered Publishing (`.github/workflows/publish.yml`)**

### **Triggers**
```yaml
on:
  release:
    types: [published]
  push:
    tags:
      - 'v*'
```

### **Build Process**
1. **Setup Environment**: Node.js 18 + pnpm 8.15.0
2. **Install Dependencies**: `pnpm install --frozen-lockfile`
3. **Lint Code**: `pnpm run check` (Biome)
4. **Type Check**: `pnpm run typecheck`
5. **Run Tests**: `pnpm run test --run`
6. **Build Tokens**: `pnpm run build`
7. **Verify Artifacts**: Check dist/ files exist
8. **Publish Package**: `pnpm publish --access public --no-git-checks`

### **Build Outputs**
```
dist/
├── index.js          # Main entry point
├── index.cjs         # CommonJS build
├── index.d.ts        # TypeScript definitions
└── build/
    └── outputs/
        ├── tailwind/
        │   └── variables.css    # CSS variables
        ├── scss/
        │   └── variables.scss   # SCSS variables
        └── js/
            └── tokens.js        # JavaScript tokens
```

## 🧪 **Testing Pipeline**

### **Test Categories**
1. **Token Generation Tests** (102 tests)
   - CSS variable naming validation
   - Color value accuracy
   - Typography configuration
   - Spacing and sizing tokens

2. **Regression Tests** (13 tests)
   - CSS variable dot notation prevention
   - Typography font family validation
   - Brand compliance checks
   - Variable structure validation

3. **Tailwind Integration Tests**
   - CSS output validation
   - Variable resolution
   - Framework compatibility

### **Test Commands**
```bash
pnpm test              # Run all tests
pnpm test:run          # Run tests once (CI mode)
pnpm test:tailwind     # Test Tailwind integration
```

## 🚀 **Release Process**

### **Automatic Release Flow**
1. **Developer updates** `package.json` version (e.g., 1.0.1 → 1.1.0)
2. **Commit and push** to main branch
3. **CI workflow runs** and detects version change
4. **Git tag created** automatically (v1.1.0)
5. **Publish workflow triggered** by tag
6. **Package built, tested, and published** to GitHub Packages
7. **GitHub Release created** with release notes

### **Manual Release (If Needed)**
```bash
# Create tag manually
git tag -a "v1.1.0" -m "Release v1.1.0"
git push origin "v1.1.0"

# This triggers the publish workflow
```

## 📦 **Package Publication**

### **GitHub Packages Configuration**
```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "public"
  }
}
```

### **Authentication**
- Uses `GITHUB_TOKEN` (automatic in Actions)
- Publishes to `@thepia/branding` scope
- Public access for easier consumption

### **Version Management**
- Semantic versioning (1.0.1, 1.1.0, etc.)
- Git tags match package versions
- Automatic GitHub Releases created

## 🔧 **Environment Setup**

### **Required Tools**
- **Node.js**: 18.x
- **pnpm**: 8.15.0 (consistent across workflows)
- **Biome**: For linting and formatting
- **Vitest**: For testing
- **TypeScript**: For type checking

### **Dependencies**
```json
{
  "dependencies": {
    "chokidar": "^3.5.3",
    "fast-glob": "^3.3.0", 
    "fs-extra": "^11.0.0",
    "kleur": "^4.1.5"
  }
}
```

## 🚨 **Common Issues & Solutions**

### **Issue: pnpm Setup Failures**
**Solution**: Ensure pnpm is set up before Node.js
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v2
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
```

### **Issue: Duplicate Tags**
**Solution**: Version detection prevents duplicates
```bash
if git tag -l "v$CURRENT_VERSION" | grep -q "v$CURRENT_VERSION"; then
  echo "Tag already exists, skipping"
fi
```

### **Issue: Authentication Failures**
**Solution**: Verify GitHub Packages setup
```yaml
registry-url: 'https://npm.pkg.github.com'
env:
  NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📊 **Monitoring & Debugging**

### **Workflow Status**
- **CI Workflow**: Should pass on every push/PR
- **Publish Workflow**: Should only run on tags
- **Check**: https://github.com/thepia/branding/actions

### **Debug Commands**
```bash
# Check current version
node -p "require('./package.json').version"

# Check if tag exists
git tag -l "v1.1.0"

# Test build locally
pnpm install
pnpm run build
pnpm test

# Check package publication
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding
```

### **Success Indicators**
- ✅ All tests pass (115+ tests)
- ✅ Build artifacts generated in `dist/`
- ✅ Package published to GitHub Packages
- ✅ Git tag created
- ✅ GitHub Release created

## 🎯 **Development Workflow**

### **Making Changes**
1. **Create feature branch** from main
2. **Make changes** to tokens, tests, or build
3. **Run tests locally**: `pnpm test`
4. **Create PR** to main branch
5. **CI runs tests** automatically
6. **Merge when tests pass**

### **Creating Releases**
1. **Update version** in `package.json`
2. **Commit**: `git commit -m "bump: version 1.1.0"`
3. **Push to main**: `git push origin main`
4. **Automatic**: Tag created → Package published

### **Emergency Fixes**
1. **Hotfix branch** from main
2. **Fix issue** and update version
3. **Fast-track merge** to main
4. **Automatic release** follows

## 📚 **Related Files**

- **`.github/workflows/ci.yml`**: Main CI workflow
- **`.github/workflows/publish.yml`**: Publishing workflow
- **`package.json`**: Version and scripts
- **`vitest.config.ts`**: Test configuration
- **`biome.json`**: Linting configuration
- **`tsconfig.json`**: TypeScript configuration

---

This workflow ensures reliable, automatic publishing of @thepia/branding with comprehensive testing and proper version management.
