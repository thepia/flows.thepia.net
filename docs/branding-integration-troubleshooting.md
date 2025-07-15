# Branding Integration Troubleshooting Guide

## 🎯 **Overview**

This guide documents how to troubleshoot and fix @thepia/branding integration issues in flows.thepia.net and other Thepia projects.

## 🔧 **Current Integration Status**

### **flows.thepia.net Integration**
- ✅ **Phase 1 Complete**: Colors working perfectly with temporary fix
- ✅ **Advanced Tokens**: Typography, spacing, border radius integrated
- ✅ **Visual Regression Tests**: 8 tests passing
- ⏳ **Ready for**: Official v1.1.0 package integration

### **Package Status**
- ✅ **@thepia/branding@1.1.0**: Published with all fixes
- ✅ **CSS Variables**: Fixed dot → dash notation
- ✅ **Typography**: Fixed Inter → Bembo primary font
- ✅ **Regression Tests**: 13 tests prevent future bugs

## 🚨 **Common Issues & Solutions**

### **Issue 1: CSS Variables Not Loading**

**Symptoms:**
```css
/* Variables show as undefined */
background-color: var(--color-brand-primary); /* Not working */
```

**Diagnosis:**
```bash
# Check if branding CSS is loaded
pnpm build
# Look for CSS import errors in build output
```

**Solutions:**

**Option A: Use Official Package (Recommended)**
```bash
# Update to latest version
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm update @thepia/branding
```

**Option B: Use Temporary Fix**
```typescript
// In astro.config.mjs or main CSS file
import './src/styles/branding-fixed.css';
```

### **Issue 2: Wrong CSS Variable Names (Dots vs Dashes)**

**Symptoms:**
```css
/* Old broken format */
--color.brand.primary  ❌
--typography.font.family.brand.primary  ❌
```

**Solution:**
```css
/* Correct format (v1.1.0+) */
--color-brand-primary  ✅
--typography-font-family-brand-primary  ✅
```

**Migration Script:**
```bash
# Find and replace in your CSS files
find src -name "*.css" -exec sed -i 's/--color\.brand\.primary/--color-brand-primary/g' {} \;
find src -name "*.css" -exec sed -i 's/--typography\.font\.family\.brand\.primary/--typography-font-family-brand-primary/g' {} \;
```

### **Issue 3: GitHub Packages Authentication**

**Symptoms:**
```bash
npm ERR! 401 Unauthorized
npm ERR! '@thepia/branding@^1.1.0' is not in the npm registry
```

**Solution:**
```bash
# Set up authentication
export NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN

# Or add to .env file
echo "NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN" >> .env

# Verify authentication
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding
```

### **Issue 4: Build Failures After Branding Update**

**Symptoms:**
```bash
[ERROR] Could not resolve "var(--color-brand-primary)"
```

**Diagnosis Steps:**
1. **Check CSS import order**
2. **Verify package version**
3. **Test with temporary fix**

**Solution:**
```typescript
// Ensure branding is imported first
import '@thepia/branding/build/outputs/tailwind/variables.css';
// OR use temporary fix
import './styles/branding-fixed.css';
```

### **Issue 5: Visual Regression Test Failures**

**Symptoms:**
```bash
❌ Button styling test failed
Expected: rgb(152, 138, 202)
Actual: rgb(0, 0, 0)
```

**Diagnosis:**
```bash
# Run visual tests
npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium

# Check screenshots
ls test-results/
```

**Solution:**
```bash
# Update test expectations if changes are intentional
npx playwright test --update-snapshots

# Or fix CSS if changes are unintentional
# Check branding-fixed.css vs official package
```

## 🔄 **Integration Workflow**

### **Step 1: Verify Package Availability**
```bash
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding
```

### **Step 2: Update Package**
```bash
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm update @thepia/branding
```

### **Step 3: Test Integration**
```bash
pnpm build
pnpm test  # If you have tests
```

### **Step 4: Visual Verification**
```bash
npx playwright test tests/e2e/visual-regression.spec.ts
```

### **Step 5: Remove Temporary Fix (When Ready)**
```typescript
// Remove this line when official package works
// import './styles/branding-fixed.css';
```

## 🧪 **Testing Strategy**

### **Visual Regression Tests**
```typescript
// tests/e2e/visual-regression.spec.ts
test('button styling with branding tokens', async ({ page }) => {
  await page.goto('/');
  
  const button = page.locator('.btn-primary').first();
  await expect(button).toHaveCSS('background-color', 'rgb(152, 138, 202)');
  await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
});
```

### **CSS Variable Tests**
```typescript
test('CSS variables are loaded', async ({ page }) => {
  await page.goto('/');
  
  const primaryColor = await page.evaluate(() => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--color-brand-primary');
  });
  
  expect(primaryColor.trim()).toBe('#988ACA');
});
```

## 📋 **Debugging Checklist**

### **When CSS Variables Don't Work**
- [ ] Check if @thepia/branding is installed
- [ ] Verify NODE_AUTH_TOKEN is set
- [ ] Check CSS import order
- [ ] Look for build errors
- [ ] Test with branding-fixed.css
- [ ] Check browser dev tools for CSS loading

### **When Colors Are Wrong**
- [ ] Check package version (should be 1.1.0+)
- [ ] Verify CSS variable names (dashes not dots)
- [ ] Check if temporary fix is still active
- [ ] Run visual regression tests
- [ ] Compare with thepia.com colors

### **When Build Fails**
- [ ] Check pnpm lockfile
- [ ] Clear node_modules and reinstall
- [ ] Check Astro/Vite configuration
- [ ] Verify import paths
- [ ] Test with minimal reproduction

## 🔧 **Emergency Fixes**

### **Quick Fix: Use Temporary Branding**
```typescript
// In astro.config.mjs or main CSS
import './src/styles/branding-fixed.css';
```

### **Quick Fix: Manual CSS Variables**
```css
:root {
  --color-brand-primary: #988ACA;
  --color-palette-thepia-400: #988ACA;
  --typography-font-family-brand-primary: Bembo, "EB Garamond", "New York", Times, serif;
}
```

### **Quick Fix: Force Package Reinstall**
```bash
rm -rf node_modules/@thepia
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm install --force
```

## 📞 **Getting Help**

### **Check Package Status**
```bash
# Latest version
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm info @thepia/branding

# GitHub Actions status
# Visit: https://github.com/thepia/branding/actions
```

### **Debug Information to Collect**
1. **Package version**: `pnpm list @thepia/branding`
2. **Build output**: `pnpm build 2>&1 | tee build.log`
3. **CSS variables**: Browser dev tools → Computed styles
4. **Test results**: `npx playwright test --reporter=list`

### **Common Commands**
```bash
# Full reset
rm -rf node_modules .astro pnpm-lock.yaml
NODE_AUTH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN pnpm install

# Test specific component
npx playwright test --grep "button styling"

# Check CSS loading
curl -s http://localhost:4321 | grep -o "var(--color-[^)]*)"
```

## 🎯 **Success Criteria**

### **Integration is Working When:**
- ✅ Build completes without errors
- ✅ CSS variables resolve to correct values
- ✅ Visual regression tests pass
- ✅ Colors match thepia.com branding
- ✅ Typography uses Bembo font family

### **Ready to Remove Temporary Fix When:**
- ✅ Official @thepia/branding@1.1.0+ installed
- ✅ All tests passing with official package
- ✅ No CSS variable naming issues
- ✅ Visual verification complete

---

This guide covers the most common branding integration issues and their solutions. Keep it updated as new issues are discovered and resolved.
