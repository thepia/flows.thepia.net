# Advanced Branding Token Analysis

## 🎯 **Objective**
Identify manual CSS values in flows.thepia.net that should be replaced with advanced branding tokens for better consistency and maintainability.

## 📊 **Current State vs. Available Branding Tokens**

### **1. Typography - Font Sizes**

**Current Manual Values:**
```css
h1 { font-size: 2.25rem; }        /* Mobile */
h1 { font-size: 3rem; }           /* Desktop */
h2 { font-size: 1.875rem; }       /* Mobile */
h2 { font-size: 2.25rem; }        /* Desktop */
h3 { font-size: 1.5rem; }         /* Mobile */
h3 { font-size: 1.875rem; }       /* Desktop */
p { font-size: 1.125rem; }
```

**Available Branding Tokens:**
```css
--size-font-xs: 0.75rem;      /* 12px */
--size-font-sm: 0.875rem;     /* 14px */
--size-font-base: 1rem;       /* 16px */
--size-font-lg: 1.125rem;     /* 18px */
--size-font-xl: 1.375rem;     /* 22px */
--size-font-2xl: 1.625rem;    /* 26px */
--size-font-3xl: 1.875rem;    /* 30px */
--size-font-4xl: 2.25rem;     /* 36px */
--size-font-5xl: 3rem;        /* 48px */
--size-font-6xl: 3.75rem;     /* 60px */
--size-font-7xl: 4.5rem;      /* 72px */
--size-font-8xl: 6rem;        /* 96px */
--size-font-9xl: 8rem;        /* 128px */
```

**Recommended Mapping:**
```css
/* REPLACE: Manual font sizes */
h1 { font-size: var(--size-font-4xl); }        /* 2.25rem → 2.25rem ✅ */
@media (min-width: 768px) {
  h1 { font-size: var(--size-font-5xl); }      /* 3rem → 3rem ✅ */
}
h2 { font-size: var(--size-font-3xl); }        /* 1.875rem → 1.875rem ✅ */
@media (min-width: 768px) {
  h2 { font-size: var(--size-font-4xl); }      /* 2.25rem → 2.25rem ✅ */
}
h3 { font-size: var(--size-font-xl); }         /* 1.5rem → 1.375rem ⚠️ slight change */
@media (min-width: 768px) {
  h3 { font-size: var(--size-font-3xl); }      /* 1.875rem → 1.875rem ✅ */
}
p { font-size: var(--size-font-lg); }          /* 1.125rem → 1.125rem ✅ */
```

### **2. Typography - Line Heights**

**Current Manual Values:**
```css
p { line-height: 1.75; }
```

**Available Branding Tokens:**
```css
--size-line-1: 1;
--size-line-tight: 1.25;
--size-line-snug: 1.375;
--size-line-normal: 1.5;
--size-line-relaxed: 1.625;
--size-line-loose: 2;
```

**Recommended Mapping:**
```css
/* REPLACE: Manual line height */
p { line-height: var(--size-line-relaxed); }   /* 1.75 → 1.625 ⚠️ slight change */
/* OR keep current if 1.75 is critical */
```

### **3. Spacing - Component Padding/Margins**

**Current Manual Values:**
```css
.btn-primary { padding: 0.75rem 1.5rem; }
.btn-secondary { padding: 0.75rem 1.5rem; }
.btn-outline { padding: 0.75rem 1.5rem; }
.card { padding: 1.5rem; }
.container { padding-left: 1rem; padding-right: 1rem; }
.container { padding-left: 1.5rem; padding-right: 1.5rem; } /* @media sm */
.container { padding-left: 2rem; padding-right: 2rem; }     /* @media lg */
.feature-grid { gap: 2rem; }
```

**Available Branding Tokens:**
```css
--spacing-semantic-xs: 0.25rem;
--spacing-semantic-sm: 0.5rem;
--spacing-semantic-md: 1rem;
--spacing-semantic-lg: 2rem;
--spacing-semantic-xl: 4rem;
--spacing-semantic-component-padding: 1rem;
--spacing-semantic-component-margin: 1rem;
--spacing-semantic-component-gap: 0.5rem;
--spacing-semantic-layout-section: 4rem;
--spacing-semantic-layout-container: 2rem;
--spacing-semantic-layout-grid: 1rem;
```

**Recommended Mapping:**
```css
/* REPLACE: Manual component spacing */
.btn-primary, .btn-secondary, .btn-outline {
  padding: var(--spacing-semantic-sm) var(--spacing-semantic-md); /* 0.5rem 1rem vs 0.75rem 1.5rem ⚠️ */
}
.card {
  padding: var(--spacing-semantic-component-padding); /* 1rem vs 1.5rem ⚠️ */
}
.container {
  padding-left: var(--spacing-semantic-md);   /* 1rem ✅ */
  padding-right: var(--spacing-semantic-md);  /* 1rem ✅ */
}
@media (min-width: 640px) {
  .container {
    padding-left: var(--spacing-semantic-md);   /* 1rem vs 1.5rem ⚠️ */
    padding-right: var(--spacing-semantic-md);  /* 1rem vs 1.5rem ⚠️ */
  }
}
@media (min-width: 1024px) {
  .container {
    padding-left: var(--spacing-semantic-layout-container); /* 2rem ✅ */
    padding-right: var(--spacing-semantic-layout-container); /* 2rem ✅ */
  }
}
.feature-grid {
  gap: var(--spacing-semantic-lg); /* 2rem ✅ */
}
```

### **4. Border Radius**

**Current Manual Values:**
```css
.btn-primary { border-radius: 0.5rem; }
.btn-secondary { border-radius: 0.5rem; }
.btn-outline { border-radius: 0.5rem; }
.card { border-radius: 0.75rem; }
.step-indicator { border-radius: 9999px; }
```

**Available Branding Tokens:**
```css
--size-radius-0: 0px;
--size-radius-1: 0.125rem;
--size-radius-2: 0.25rem;
--size-radius-3: 0.375rem;
--size-radius-4: 0.5rem;
--size-radius-6: 0.75rem;
--size-radius-8: 1rem;
--size-radius-12: 1.5rem;
--size-radius-full: 9999px;
```

**Recommended Mapping:**
```css
/* REPLACE: Manual border radius */
.btn-primary, .btn-secondary, .btn-outline {
  border-radius: var(--size-radius-4); /* 0.5rem ✅ */
}
.card {
  border-radius: var(--size-radius-6); /* 0.75rem ✅ */
}
.step-indicator {
  border-radius: var(--size-radius-full); /* 9999px ✅ */
}
```

### **5. Section Spacing**

**Current Manual Values:**
```css
--spacing-section: 6rem;
```

**Available Branding Tokens:**
```css
--spacing-semantic-layout-section: 4rem;
```

**Issue Identified:**
```css
/* CONFLICT: Different values */
Current: 6rem
Branding: 4rem
```

**Recommendation:** This needs user approval as it will change section spacing significantly.

### **6. Container Max Width**

**Current Manual Values:**
```css
.container { max-width: 80rem; }
```

**Available Branding Tokens:**
```css
--size-width-xs: 20rem;
--size-width-sm: 24rem;
--size-width-md: 28rem;
--size-width-lg: 32rem;
--size-width-xl: 36rem;
--size-width-2xl: 42rem;
--size-width-3xl: 48rem;
--size-width-4xl: 56rem;
--size-width-5xl: 64rem;
--size-width-6xl: 72rem;
--size-width-7xl: 80rem;
```

**Recommended Mapping:**
```css
/* REPLACE: Manual container width */
.container {
  max-width: var(--size-width-7xl); /* 80rem ✅ */
}
```

### **7. Component Heights**

**Current Manual Values:**
```css
.step-indicator { width: 2rem; height: 2rem; }
```

**Available Branding Tokens:**
```css
--size-height-xs: 1.5rem;
--size-height-sm: 2rem;
--size-height-md: 2.5rem;
--size-height-lg: 3rem;
--size-height-xl: 3.5rem;
--size-height-2xl: 4rem;
--size-height-3xl: 4.5rem;
```

**Recommended Mapping:**
```css
/* REPLACE: Manual component sizes */
.step-indicator {
  width: var(--size-height-sm);  /* 2rem ✅ */
  height: var(--size-height-sm); /* 2rem ✅ */
}
```

## 🚨 **Impact Assessment**

### **Zero Visual Impact (Safe to Apply)**
- ✅ Font sizes (h1, h2, p) - exact matches
- ✅ Border radius - exact matches  
- ✅ Container max-width - exact match
- ✅ Step indicator size - exact match
- ✅ Feature grid gap - exact match

### **Minor Visual Changes (Requires Testing)**
- ⚠️ h3 font size: 1.5rem → 1.375rem (mobile)
- ⚠️ Line height: 1.75 → 1.625
- ⚠️ Button padding: 0.75rem 1.5rem → 0.5rem 1rem
- ⚠️ Card padding: 1.5rem → 1rem
- ⚠️ Container padding (sm): 1.5rem → 1rem

### **Significant Visual Changes (Requires User Approval)**
- 🚨 Section spacing: 6rem → 4rem (major layout change)

## 📋 **Implementation Priority**

### **Phase 1: Zero Impact Changes**
1. Typography font sizes
2. Border radius values
3. Container max-width
4. Component heights

### **Phase 2: Minor Changes (with testing)**
1. Button and card padding
2. Container responsive padding
3. Line heights

### **Phase 3: Major Changes (user approval required)**
1. Section spacing (6rem → 4rem)

## 🎯 **Next Steps**

1. **Implement Phase 1** - Zero visual impact changes
2. **Test Phase 2** - Minor changes with visual regression testing
3. **User approval** - For Phase 3 section spacing changes
4. **Update documentation** - Record all token mappings
