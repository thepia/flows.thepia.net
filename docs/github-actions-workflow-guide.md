# GitHub Actions Build & Release Workflow Guide

## 🎯 **Overview**

This guide documents the proven GitHub Actions workflow architecture for automatic build, test, tag, and publish pipelines. Based on the successful @thepia/branding package automation.

## 🏗️ **Workflow Architecture**

### **Two-Workflow Pattern (Recommended)**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   ci.yml    │───▶│  Git Tag     │───▶│   publish.yml   │
│ Test + Tag  │    │  (v1.2.3)    │    │ Build + Publish │
└─────────────┘    └──────────────┘    └─────────────────┘
```

**Benefits:**
- ✅ **Clean separation** of concerns
- ✅ **Reliable triggering** via git tags
- ✅ **Easy debugging** - each workflow has single responsibility
- ✅ **Reusable pattern** across projects

### **Anti-Pattern: Single Monolithic Workflow**
❌ **Don't do this:** One workflow that tests + publishes
- Hard to debug when publishing fails
- Complex conditional logic
- Authentication issues mixing test/publish steps

## 📋 **Workflow 1: CI with Auto-Tagging (`ci.yml`)**

### **Purpose**
- Run tests on every push/PR
- Create git tags when package.json version changes (main branch only)

### **Key Features**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '10.11.0'

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

  tag:
    name: Create Tag for New Version
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check if version changed
        id: version-check
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          
          # Check if tag already exists
          if git tag -l "v$CURRENT_VERSION" | grep -q "v$CURRENT_VERSION"; then
            echo "Tag v$CURRENT_VERSION already exists"
            echo "should_tag=false" >> $GITHUB_OUTPUT
          else
            echo "New version detected: $CURRENT_VERSION"
            echo "should_tag=true" >> $GITHUB_OUTPUT
            echo "version=$CURRENT_VERSION" >> $GITHUB_OUTPUT
          fi

      - name: Create and push tag
        if: steps.version-check.outputs.should_tag == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "v${{ steps.version-check.outputs.version }}" -m "Release v${{ steps.version-check.outputs.version }}"
          git push origin "v${{ steps.version-check.outputs.version }}"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### **Critical Setup Details**

**1. pnpm Setup Order (IMPORTANT)**
```yaml
# ✅ CORRECT: Setup pnpm BEFORE Node.js
- name: Setup pnpm
  uses: pnpm/action-setup@v2
  with:
    version: ${{ env.PNPM_VERSION }}

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'pnpm'  # This requires pnpm to be installed first
```

**2. Version Detection Logic**
```bash
# Check if tag already exists to prevent duplicates
if git tag -l "v$CURRENT_VERSION" | grep -q "v$CURRENT_VERSION"; then
  echo "should_tag=false" >> $GITHUB_OUTPUT
else
  echo "should_tag=true" >> $GITHUB_OUTPUT
fi
```

**3. Git Configuration for Bot**
```bash
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
```

## 📦 **Workflow 2: Tag-Triggered Publishing (`publish.yml`)**

### **Purpose**
- Triggered when git tags are created
- Build, test, and publish packages
- Create GitHub releases

### **Key Features**
```yaml
name: Publish to GitHub Packages

on:
  release:
    types: [published]
  push:
    tags:
      - 'v*'

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8.15.0'

jobs:
  publish:
    name: Publish Package
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          registry-url: 'https://npm.pkg.github.com'
          scope: '@thepia'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build library
        run: pnpm run build

      - name: Run tests
        run: pnpm run test --run

      - name: Publish to GitHub Packages
        run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### **Critical Setup Details**

**1. GitHub Packages Authentication**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    registry-url: 'https://npm.pkg.github.com'  # GitHub Packages registry
    scope: '@thepia'                            # Your organization scope

# Later in publish step:
env:
  NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Automatic token
```

**2. Permissions (REQUIRED)**
```yaml
permissions:
  contents: read    # Read repository contents
  packages: write   # Write to GitHub Packages
```

**3. Publish Command**
```bash
pnpm publish --access public --no-git-checks
```
- `--access public`: Make package publicly accessible
- `--no-git-checks`: Skip git status checks (CI environment)

## 🔄 **Complete Workflow Flow**

### **Developer Workflow**
1. **Make changes** to code
2. **Update version** in `package.json` (e.g., 1.0.1 → 1.1.0)
3. **Commit and push** to main branch
4. **Automatic magic happens** ✨

### **Automatic GitHub Actions Flow**
```
Push to main
    ↓
CI Workflow Runs
    ↓
Tests Pass ✅
    ↓
Version Check: 1.1.0 ≠ 1.0.1
    ↓
Create Git Tag: v1.1.0
    ↓
Push Tag to GitHub
    ↓
Publish Workflow Triggered
    ↓
Build → Test → Publish
    ↓
Package Published ✅
GitHub Release Created ✅
```

## 🛠️ **Setup Checklist**

### **Repository Setup**
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/publish.yml`
- [ ] Ensure `package.json` has correct version
- [ ] Set up GitHub Packages in `package.json`:
  ```json
  {
    "publishConfig": {
      "registry": "https://npm.pkg.github.com",
      "access": "public"
    }
  }
  ```

### **GitHub Repository Settings**
- [ ] **Actions → General → Workflow permissions**: "Read and write permissions"
- [ ] **Actions → General → Allow GitHub Actions to create and approve pull requests**: ✅ Enabled

### **Package Manager Setup**
- [ ] Use consistent package manager (pnpm recommended)
- [ ] Include lockfile in repository (`pnpm-lock.yaml`)
- [ ] Set up proper scripts in `package.json`:
  ```json
  {
    "scripts": {
      "build": "...",
      "test": "...",
      "test:run": "... --run"
    }
  }
  ```

## 🚨 **Common Issues & Solutions**

### **Issue: "Unable to locate executable file: pnpm"**
**Solution:** Setup pnpm BEFORE Node.js setup
```yaml
# ✅ CORRECT ORDER
- name: Setup pnpm
  uses: pnpm/action-setup@v2
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
```

### **Issue: "pnpm install --frozen-lockfile" fails**
**Solution:** Use `pnpm install` without `--frozen-lockfile` in CI
```yaml
- name: Install dependencies
  run: pnpm install  # Not --frozen-lockfile
```

### **Issue: Authentication failures**
**Solution:** Check registry URL and token setup
```yaml
registry-url: 'https://npm.pkg.github.com'  # Correct URL
env:
  NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Automatic token
```

### **Issue: Duplicate tags**
**Solution:** Check if tag exists before creating
```bash
if git tag -l "v$CURRENT_VERSION" | grep -q "v$CURRENT_VERSION"; then
  echo "should_tag=false" >> $GITHUB_OUTPUT
fi
```

## 🎯 **Best Practices**

### **1. Environment Variables**
```yaml
env:
  NODE_VERSION: '18'
  PNPM_VERSION: '10.11.0'
```
- Centralize versions for easy updates
- Use consistent versions across workflows

### **2. Job Dependencies**
```yaml
needs: test  # Publish only runs if tests pass
if: github.ref == 'refs/heads/main'  # Only on main branch
```

### **3. Conditional Execution**
```yaml
if: steps.version-check.outputs.should_tag == 'true'
```
- Use step outputs for complex conditions
- Prevent unnecessary runs

### **4. Permissions**
```yaml
permissions:
  contents: read
  packages: write
```
- Use minimal required permissions
- Be explicit about what each job needs

## 📚 **Testing Your Workflow**

### **1. Test CI Workflow**
- Create feature branch
- Make changes
- Open PR → CI should run tests
- Merge to main → CI should run tests + create tag (if version changed)

### **2. Test Publish Workflow**
- Update version in `package.json`
- Commit to main
- Check that tag is created
- Check that publish workflow runs
- Verify package is published

### **3. Debug Failed Workflows**
- Check workflow logs in GitHub Actions tab
- Look for specific error messages
- Verify environment variables and secrets
- Test commands locally first

## 🔗 **Related Documentation**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [pnpm in CI Documentation](https://pnpm.io/continuous-integration)

## 🚀 **Quick Reference Card**

### **Essential Commands**
```bash
# Check if workflow will trigger
git tag -l "v1.2.3"  # Check if tag exists

# Manual tag creation (if needed)
git tag -a "v1.2.3" -m "Release v1.2.3"
git push origin "v1.2.3"

# Check package publication
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @org/package

# Debug workflow locally
pnpm install
pnpm build
pnpm test
```

### **Workflow Triggers**
```yaml
# CI: Test everything
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Publish: Only on tags
on:
  push:
    tags: ['v*']
```

### **Critical Setup Pattern**
```yaml
# 1. Setup pnpm FIRST
- uses: pnpm/action-setup@v2
  with:
    version: '10.11.0'

# 2. Setup Node.js with cache
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'pnpm'
    registry-url: 'https://npm.pkg.github.com'  # For publish jobs only

# 3. Install dependencies
- run: pnpm install  # No --frozen-lockfile in CI
```

### **Version Bump → Auto Publish**
1. Edit `package.json`: `"version": "1.2.3"`
2. Commit: `git commit -m "bump: version 1.2.3"`
3. Push: `git push origin main`
4. **Automatic**: Tag created → Package published ✨

---

This workflow pattern has been proven to work reliably for @thepia/branding and can be adapted for any Node.js package that needs automatic publishing.
