# @thepia/branding Integration Plan

## Overview

The `@thepia/branding` package is a comprehensive, framework-agnostic branding system that will capture all details of the Thepia brand and allow it to be applied consistently across all websites and applications. This document outlines the integration plan for flows.thepia.net.

## Current Status

- ✅ **@thepia/branding package exists** at `/Volumes/Projects/Thepia/branding`
- ✅ **Package is published** as `@thepia/branding@1.0.1` on GitHub Packages
- ✅ **thepia.com has dependency** but doesn't use it yet (will migrate later)
- 🔄 **flows.thepia.net** will be the first implementation to test and refine the system
- ❌ **Integration not yet implemented** - this is the next major milestone

## Package Architecture

Based on research, `@thepia/branding` provides:

### **Design Tokens**
- **Colors**: Brand, semantic, and neutral color palettes
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scales
- **Shadows**: Elevation system
- **Border Radius**: Corner rounding options
- **Transitions**: Animation timing

### **Multiple Output Formats**
- **CSS**: Custom properties and utility classes
- **JavaScript/TypeScript**: Token objects and types
- **JSON**: Platform-agnostic token definitions
- **Tailwind**: Preset and theme configuration
- **SCSS**: Variables and mixins

### **Brand Assets**
- **Logos**: SVG, PNG formats in multiple variants
- **Icons**: Brand-specific iconography
- **Illustrations**: ManyPixels branded illustrations
- **Fonts**: Custom font files and @font-face declarations

## Integration Strategy

### **Phase 1: Basic Integration (Current)**
Replace manual design tokens with @thepia/branding:

```bash
# Install the package
pnpm add @thepia/branding

# Import in CSS
@import '@thepia/branding/css/tokens.css';

# Use in Tailwind config
import thepiaPreset from '@thepia/branding/tailwind/preset';
```

### **Phase 2: Asset Integration**
Replace local assets with branding package assets:

```javascript
// Import brand assets
import { brandTokens } from '@thepia/branding';

// Use logo paths
const logo = brandTokens.brand.logo.primary.value;
const favicon = brandTokens.brand.logo.favicon.value;
```

### **Phase 3: Component Theming**
Apply brand-aware component styling:

```css
/* Use brand tokens in components */
.btn-primary {
  background-color: var(--color-brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-brand-primary);
}
```

## Implementation Plan

### **Step 1: Install and Configure**

1. **Add dependency**:
   ```bash
   pnpm add @thepia/branding
   ```

2. **Update Tailwind config** to use branding preset:
   ```javascript
   // tailwind.config.js (when we add it back)
   import thepiaPreset from '@thepia/branding/tailwind/preset';
   
   export default {
     presets: [thepiaPreset],
     content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}']
   };
   ```

3. **Import brand CSS** in global styles:
   ```css
   /* src/styles/global.css */
   @import '@thepia/branding/css/tokens.css';
   @import "tailwindcss";
   ```

### **Step 2: Replace Manual Tokens**

Replace current manual color/typography definitions with branding package tokens:

```css
/* BEFORE: Manual tokens */
@theme {
  --color-primary: #988aca;
  --font-serif: "EB Garamond", Times, serif;
}

/* AFTER: Branding package tokens */
/* Tokens automatically available from @thepia/branding */
```

### **Step 3: Asset Integration**

1. **Logo integration**:
   ```astro
   ---
   import { brandTokens } from '@thepia/branding';
   ---
   <img src={brandTokens.brand.logo.primary.value} alt="Thepia" />
   ```

2. **Font integration**:
   ```css
   /* Use brand fonts from package */
   @import '@thepia/branding/fonts/fonts.css';
   ```

### **Step 4: Component Migration**

Update all components to use brand tokens instead of manual values:

```css
/* BEFORE */
.btn-primary {
  background-color: var(--color-primary);
}

/* AFTER */
.btn-primary {
  background-color: var(--color-brand-primary);
}
```

## Benefits

### **Brand Consistency**
- Ensures identical brand application across all Thepia properties
- Prevents brand drift and inconsistencies
- Centralizes brand updates and changes

### **Developer Experience**
- Provides TypeScript types for all brand tokens
- Offers multiple integration methods (CSS, JS, Tailwind)
- Includes comprehensive documentation and examples

### **Maintainability**
- Single source of truth for all brand assets
- Automated token generation and distribution
- Version-controlled brand evolution

### **Framework Agnostic**
- Works with any CSS framework or vanilla CSS
- Supports multiple output formats
- Can be used in any JavaScript framework

## Testing Strategy

### **Visual Regression Testing**
- Compare before/after screenshots
- Ensure no visual changes during migration
- Test across different screen sizes and themes

### **Brand Compliance Testing**
- Validate color usage matches brand guidelines
- Check typography hierarchy and spacing
- Verify logo usage and placement

### **Integration Testing**
- Test token imports and usage
- Verify asset loading and accessibility
- Check build process and bundle size impact

## Migration Timeline

1. **Week 1**: Install package and basic CSS integration
2. **Week 2**: Replace manual tokens with branding tokens
3. **Week 3**: Integrate brand assets (logos, fonts)
4. **Week 4**: Update components and test thoroughly
5. **Week 5**: Documentation and refinement

## Success Criteria

- ✅ All manual brand tokens replaced with @thepia/branding
- ✅ Visual appearance unchanged after migration
- ✅ Build process works correctly
- ✅ Bundle size impact is minimal
- ✅ Developer experience is improved
- ✅ Brand compliance is verified

## Future Considerations

### **thepia.com Migration**
After successful implementation in flows.thepia.net:
- Apply lessons learned to thepia.com migration
- Refine branding package based on real-world usage
- Establish migration patterns for other Thepia properties

### **Package Evolution**
- Add new brand assets as needed
- Expand token system based on usage patterns
- Improve developer tooling and documentation

### **Multi-brand Support**
- Extend package to support white-label branding
- Enable customer-specific brand overrides
- Maintain Thepia brand as default/fallback

## Notes

- This integration serves as a **proof of concept** for the branding system
- Issues discovered will be **fed back** into @thepia/branding improvements
- Success here will **validate the approach** for broader Thepia ecosystem adoption
- The package is **actively maintained** and will evolve based on real-world usage
