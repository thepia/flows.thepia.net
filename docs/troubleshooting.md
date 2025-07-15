# @thepia/branding Troubleshooting Guide

## 🚨 **Common Workflow Issues**

### **Issue: CI Workflow Failing**

**Symptoms:**
- Tests fail in GitHub Actions
- Build errors in CI
- pnpm setup failures

**Diagnosis:**
```bash
# Run tests locally
pnpm test

# Check build locally
pnpm run build

# Check linting
pnpm run check
```

**Solutions:**
1. **Fix test failures**: Address failing tests locally first
2. **Fix build issues**: Ensure `pnpm run build` works locally
3. **Fix linting**: Run `pnpm run check` and fix issues

### **Issue: Publish Workflow Not Triggering**

**Symptoms:**
- Version updated but no tag created
- No publish workflow running
- Package not published

**Diagnosis:**
```bash
# Check if tag exists
git tag -l "v$(node -p "require('./package.json').version")"

# Check workflow runs
# Visit: https://github.com/thepia/branding/actions
```

**Solutions:**
1. **Manual tag creation**:
   ```bash
   VERSION=$(node -p "require('./package.json').version")
   git tag -a "v$VERSION" -m "Release v$VERSION"
   git push origin "v$VERSION"
   ```

2. **Check CI workflow**: Ensure CI completed successfully first

### **Issue: Package Not Publishing**

**Symptoms:**
- Publish workflow runs but fails
- Authentication errors
- Package not available

**Diagnosis:**
```bash
# Check package status
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding

# Check workflow logs in GitHub Actions
```

**Solutions:**
1. **Authentication**: Verify GitHub token permissions
2. **Build artifacts**: Ensure `dist/` files are generated
3. **Registry**: Confirm GitHub Packages registry URL

## 🔧 **Development Issues**

### **Issue: Tests Failing Locally**

**Common Test Failures:**

**1. CSS Variable Naming Tests**
```bash
# Error: CSS variables contain dots
Expected: --color-brand-primary
Actual: --color.brand.primary
```

**Solution:** Fix token generation in `src/` files to use dashes

**2. Typography Tests**
```bash
# Error: Wrong primary font
Expected: Bembo
Actual: Inter
```

**Solution:** Update typography configuration in token definitions

**3. Color Value Tests**
```bash
# Error: Wrong brand color
Expected: #988ACA
Actual: #000000
```

**Solution:** Verify color definitions in brand tokens

### **Issue: Build Failures**

**Symptoms:**
- `pnpm run build` fails
- Missing output files
- TypeScript errors

**Solutions:**
1. **Clean build**:
   ```bash
   rm -rf dist/
   pnpm run build
   ```

2. **Check TypeScript**:
   ```bash
   pnpm run typecheck
   ```

3. **Verify dependencies**:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

## 📦 **Package Issues**

### **Issue: Package Not Installing**

**Symptoms:**
```bash
npm ERR! 401 Unauthorized
npm ERR! '@thepia/branding@^1.1.0' is not in the npm registry
```

**Solutions:**
1. **Set up authentication**:
   ```bash
   export NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN
   ```

2. **Configure npm/pnpm**:
   ```bash
   echo "@thepia:registry=https://npm.pkg.github.com" >> .npmrc
   ```

3. **Verify package exists**:
   ```bash
   NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding
   ```

### **Issue: Wrong Package Version**

**Symptoms:**
- Old CSS variable format (dots)
- Missing typography fixes
- Outdated token values

**Solutions:**
1. **Check installed version**:
   ```bash
   pnpm list @thepia/branding
   ```

2. **Update to latest**:
   ```bash
   NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm update @thepia/branding
   ```

3. **Verify version**:
   ```bash
   NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding
   ```

## 🧪 **Testing Issues**

### **Issue: Regression Tests Failing**

**Critical Tests:**
1. **CSS Variable Naming**: Prevents dots in variable names
2. **Typography Configuration**: Ensures Bembo primary font
3. **Brand Compliance**: Validates exact brand colors

**Debug Commands:**
```bash
# Run specific test categories
pnpm test -- --grep "CSS variable naming"
pnpm test -- --grep "Typography"
pnpm test -- --grep "Brand compliance"

# Run with verbose output
pnpm test -- --reporter=verbose
```

### **Issue: Tailwind Integration Tests Failing**

**Symptoms:**
- CSS output doesn't match expected
- Variable resolution issues
- Framework compatibility problems

**Solutions:**
1. **Check CSS output**:
   ```bash
   pnpm run build
   cat build/outputs/tailwind/variables.css
   ```

2. **Test Tailwind integration**:
   ```bash
   pnpm test:tailwind --run
   ```

## 🔄 **Workflow Recovery**

### **Emergency Package Publication**

**If automatic workflow fails:**

1. **Manual build and test**:
   ```bash
   pnpm install
   pnpm run build
   pnpm test
   ```

2. **Manual tag creation**:
   ```bash
   VERSION=$(node -p "require('./package.json').version")
   git tag -a "v$VERSION" -m "Release v$VERSION"
   git push origin "v$VERSION"
   ```

3. **Monitor publish workflow**: Check GitHub Actions

### **Rollback Procedure**

**If published version has issues:**

1. **Identify last good version**:
   ```bash
   NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding --json
   ```

2. **Create hotfix**:
   - Fix issues in new branch
   - Update version (patch increment)
   - Follow normal release process

3. **Communicate to consumers**:
   - Update documentation
   - Notify dependent projects

## 📊 **Monitoring & Health Checks**

### **Daily Health Checks**

1. **Workflow Status**:
   - Visit: https://github.com/thepia/branding/actions
   - Ensure CI is green
   - Check for failed runs

2. **Package Availability**:
   ```bash
   NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding
   ```

3. **Test Coverage**:
   ```bash
   pnpm test -- --coverage
   ```

### **Success Indicators**

- ✅ **CI Workflow**: All tests passing
- ✅ **Package Published**: Latest version available
- ✅ **Git Tags**: Proper version tags created
- ✅ **GitHub Releases**: Release notes generated
- ✅ **Consumer Projects**: Integration working

### **Warning Signs**

- ❌ **Failing Tests**: Address immediately
- ❌ **Build Failures**: Investigate and fix
- ❌ **Authentication Issues**: Check token permissions
- ❌ **Missing Artifacts**: Verify build process
- ❌ **Consumer Complaints**: Check integration

## 🆘 **Getting Help**

### **Debug Information to Collect**

1. **Workflow logs**: From GitHub Actions
2. **Local test results**: `pnpm test 2>&1 | tee test.log`
3. **Build output**: `pnpm run build 2>&1 | tee build.log`
4. **Package info**: `pnpm info @thepia/branding`
5. **Environment**: Node.js, pnpm versions

### **Escalation Path**

1. **Check documentation**: This file and workflow guide
2. **Review recent changes**: Git history and PRs
3. **Test locally**: Reproduce issues in development
4. **Check dependencies**: Ensure all tools updated
5. **Seek help**: With collected debug information

---

This guide covers the most common issues specific to the @thepia/branding repository and its GitHub Actions workflows.
