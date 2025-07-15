# Thepia Branding Integration Comparison

## Overview

This analysis examines how @thepia/branding design tokens are integrated across different repositories in the Thepia ecosystem, comparing approaches between Tailwind CSS configurations, framework-specific implementations, and CSS custom properties.

## 1. @thepia/branding Package Structure

### Token Export Formats
The branding package exports tokens in multiple formats:

- **CSS Variables**: `/build/outputs/tailwind/variables.css`
  - All tokens as CSS custom properties
  - Namespaced with specific prefixes (`--color-`, `--size-`, `--typography-`, etc.)
  - Includes legacy compatibility aliases

- **Tailwind Config**: `/build/outputs/tailwind/tailwind.config.js`
  - JavaScript object with extended theme configuration
  - Direct color values and semantic naming
  - Ready-to-use Tailwind theme extensions

### Token Categories
1. **Colors**: Brand, text, background, border, surface, icon, interactive, palettes
2. **Typography**: Font families, sizes, weights, line heights
3. **Spacing**: Scale-based and semantic spacing values
4. **Sizing**: Radius, fonts, line heights, widths, heights
5. **Brand Assets**: Logos, illustrations, whitepapers

## 2. Integration Approaches by Repository

### A. thepia.com (Astro + Tailwind v3)

**File**: `tailwind.config.js`

**Approach**: Direct value duplication
```javascript
colors: {
  primary: {
    DEFAULT: '#988ACA',
    light: '#B5A9D9',
    dark: '#7B6BB7',
    darker: '#654CA3',
  },
  'brand-green': {
    DEFAULT: '#5b9a6f',
    // ... full color scale
  }
}
```

**Characteristics**:
- Hard-coded color values (not using CSS variables)
- Manual maintenance required
- No direct import from @thepia/branding
- Custom naming conventions ('brand-green' vs branding package's 'green')

### B. flows.thepia.net (Astro + Tailwind v4)

**File**: `src/styles/global.css`

**Approach**: CSS variable mapping with @theme directive
```css
@import "@thepia/branding/tailwind/variables";

@theme {
  --color-primary: var(--color-brand-primary);
  --color-primary-50: var(--color-palette-thepia-50);
  // ... mapping branding variables to Tailwind theme
}
```

**Characteristics**:
- Uses Tailwind v4's CSS-based configuration
- Imports branding variables directly
- Maps branding tokens to Tailwind theme tokens
- Maintains single source of truth
- Framework-agnostic approach

### C. flows-auth Demo Apps (Svelte)

**File**: `examples/flows-app-demo/src/branding/design-tokens.css`

**Approach**: Generated CSS with legacy aliases
```css
:root {
  /* Direct token values */
  --color-text-1: #111827;
  --color-brand-primary: #0066cc;
  
  /* Legacy compatibility aliases */
  --primary: var(--color-brand-primary);
  --gray-50: var(--color-palette-neutral-50);
}
```

**Characteristics**:
- Generated from JSON token files
- Includes extensive legacy compatibility
- Multiple naming conventions supported
- Brand theme classes for multi-tenancy

### D. thepia-all Stencil Component

**File**: `thepia.net/src/global/app.css`

**Approach**: Basic CSS without token system
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, ...;
}
```

**Characteristics**:
- No token system integration
- Hard-coded values
- Limited styling infrastructure

## 3. CSS Custom Property Patterns

### Naming Conventions Comparison

| Category | @thepia/branding | flows.thepia.net | flows-auth demo | thepia.com |
|----------|------------------|------------------|-----------------|------------|
| Colors | `--color-brand-primary` | `--color-primary` | `--color-brand-primary` | N/A (hard-coded) |
| Spacing | `--size-space-4` | `--spacing-section` | `--size-space-4` | N/A |
| Typography | `--typography-font-family-brand-primary` | `--font-serif` | `--typography-fontFamily-brand-primary` | N/A |
| Sizing | `--size-radius-4` | Uses branding directly | `--size-radius-md` | N/A |

### Variable Inheritance Patterns

1. **Direct Usage**: flows.thepia.net imports and uses branding variables directly
2. **Mapping**: Creating semantic aliases that map to branding tokens
3. **Legacy Support**: Multiple aliases pointing to the same token for backwards compatibility

## 4. Framework-Specific Considerations

### Astro Integration
- Supports both Tailwind v3 (config-based) and v4 (CSS-based)
- Global CSS imports in Layout components
- Can use CSS modules or global styles

### SvelteKit Integration
- Component-scoped styles with `:global()` for token access
- PostCSS processing for nested CSS
- Direct CSS variable usage in component styles

### Build-time vs Runtime Processing

**Build-time**:
- Tailwind v3 config processing (thepia.com)
- CSS variable resolution during PostCSS
- Token generation from JSON sources

**Runtime**:
- CSS custom properties cascading
- Theme switching via class names
- Multi-brand support through CSS classes

## 5. Identified Patterns and Issues

### Consistency Issues

1. **Token Naming**: Different naming conventions across repos
   - `--color-brand-primary` vs `--brand-primary` vs `--primary`
   - `--size-space-4` vs `--spacing-4`

2. **Color Values**: Hard-coded values in thepia.com don't match branding package
   - thepia.com: `#988ACA` for primary
   - Actual branding: `#988ACA` (matches, but maintenance risk)

3. **Import Methods**: Varied approaches to consuming tokens
   - Direct CSS import
   - JavaScript config duplication
   - Generated CSS files

### Best Practices Observed

1. **Single Source of Truth**: flows.thepia.net approach with direct imports
2. **Semantic Aliases**: Creating meaningful names that map to design tokens
3. **Legacy Support**: Providing compatibility aliases for existing code
4. **Theme Classes**: Supporting multiple brands via CSS classes

## 6. Recommendations

### 1. Standardize Token Import Method
Adopt the flows.thepia.net approach across all repositories:
```css
@import "@thepia/branding/tailwind/variables";
```

### 2. Use Consistent Naming Convention
Follow the @thepia/branding naming structure:
- Colors: `--color-{category}-{name}-{shade}`
- Spacing: `--size-space-{value}`
- Typography: `--typography-{property}-{name}`

### 3. Migrate thepia.com to CSS Variables
Replace hard-coded values with CSS variable references:
```javascript
// Instead of:
DEFAULT: '#988ACA',

// Use:
DEFAULT: 'var(--color-brand-primary)',
```

### 4. Create Repository-Specific Token Extensions
For app-specific tokens, extend the base tokens:
```css
:root {
  /* Import base tokens */
  @import "@thepia/branding/tailwind/variables";
  
  /* App-specific extensions */
  --app-header-height: 4rem;
  --app-sidebar-width: 16rem;
}
```

### 5. Document Token Usage
Create a token usage guide for each repository:
- Which tokens to use for common patterns
- How to extend tokens for new features
- Migration guide from legacy names

### 6. Implement Token Validation
Add build-time checks to ensure:
- Only approved tokens are used
- No hard-coded values for tokenized properties
- Consistent naming across components

### 7. Consider Tailwind v4 Migration
For repositories still on v3, plan migration to v4 for:
- CSS-based configuration
- Better token integration
- Improved performance

## Conclusion

The Thepia ecosystem shows varied approaches to design token integration, with flows.thepia.net demonstrating the most mature pattern. Standardizing on CSS custom properties with direct imports from @thepia/branding will improve maintainability and consistency across all repositories. The key is establishing a single source of truth and ensuring all repositories consume tokens the same way.