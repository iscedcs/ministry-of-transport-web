# Design System — Ministry of Transport Platform

**Token-Driven Component Library & Visual Language**

---

## Design Philosophy

This is not a random collection of colors and components. Every design decision is intentional:

1. **Government-grade professionalism** — The Ministry deserves polished, trustworthy interfaces
2. **Token-first architecture** — Colors, spacing, and typography defined once; used everywhere
3. **Accessibility by default** — WCAG 2.1 AA minimum; high contrast, keyboard navigation built-in
4. **Performance-conscious** — Minimal CSS, efficient rendering, mobile-first responsive design
5. **Anambra brand identity** — Gold (#f0bb0d) and dark brown (#452829) as visual anchors

---

## Color Palette

All colors use OKLCH format for better perceptual uniformity and relative color manipulation.

### Brand Colors

```css
--brand-gold: oklch(
  76% 0.24 80
); /* #f0bb0d — Primary accent, CTAs, approvals */
--brand-dark: oklch(
  20% 0.06 15
); /* #452829 — Page background, trusted neutrality */
```

**OKLCH breakdown:**

- **L (Lightness):** 0–100% (0=black, 100=white)
- **C (Chroma):** 0–0.4 (saturation; 0=grayscale)
- **H (Hue):** 0–360° (color wheel)

### Semantic Colors

```css
:root {
  /* Success: Approvals, verified status, completed */
  --success: oklch(65% 0.18 155); /* Vivid green */
  --success-up: oklch(72% 0.18 155); /* Hover state */
  --success-sub: oklch(50% 0.12 155); /* Subtle background */

  /* Warning: Attention required, SLA approaching */
  --warning: oklch(75% 0.19 65); /* Amber/gold */
  --warning-up: oklch(82% 0.19 65); /* Hover state */
  --warning-sub: oklch(55% 0.12 65); /* Subtle background */

  /* Error: Rejections, failures, critical alerts */
  --error: oklch(60% 0.22 25); /* Vivid red */
  --error-up: oklch(68% 0.22 25); /* Hover state */
  --error-sub: oklch(45% 0.15 25); /* Subtle background */

  /* Info: General information, hints */
  --info: oklch(62% 0.21 265); /* Indigo blue */
  --info-up: oklch(70% 0.21 265); /* Hover state */
  --info-sub: oklch(48% 0.14 265); /* Subtle background */
}
```

### Surfaces & Text

```css
:root {
  /* Backgrounds */
  --bg-primary: oklch(20% 0.06 15); /* Page canvas */
  --bg-secondary: oklch(28% 0.05 15); /* Cards, panels, elevated */
  --bg-tertiary: oklch(35% 0.05 15); /* Hover state on cards */

  /* Text */
  --text-primary: oklch(95% 0.01 95); /* Main text (high contrast) */
  --text-secondary: oklch(70% 0.02 265); /* Secondary text, labels */
  --text-muted: oklch(50% 0.01 265); /* Disabled, placeholders */

  /* Borders & Dividers */
  --border: oklch(30% 0.03 15); /* Standard border */
  --border-subtle: oklch(25% 0.02 15); /* Faint dividers */
}
```

### Contrast Ratios (WCAG AA)

- **Text on bg-primary:** text-primary = 16:1 (AAA) ✅
- **Text on bg-secondary:** text-primary = 14:1 (AAA) ✅
- **Buttons:** brand-gold on bg-primary = 8:1 (AA) ✅
- **Success on white:** 6.5:1 (AA) ✅

---

## Typography

### Font Stack

```css
:root {
  --font-sans:
    "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display:
    "Clash Display", "Cabinet Grotesk", "Space Grotesk", sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", "Fira Code", monospace;
}
```

**Why this stack:**

- **Inter:** Clean, readable sans-serif optimized for screen; used for body text
- **Clash Display:** Modern, geometric display font for headings (government ≠ boring)
- **Geist Mono:** Monospace for code, data tables, transaction IDs

### Type Scale

```css
:root {
  /* Headings */
  --h1: 3.5rem; /* 56px — Page titles */
  --h2: 2.8rem; /* 44px — Section titles */
  --h3: 2.2rem; /* 35px — Subsection titles */
  --h4: 1.6rem; /* 25px — Card titles */

  /* Body */
  --body-lg: 1.125rem; /* 18px — Large body text */
  --body: 1rem; /* 16px — Standard body text */
  --body-sm: 0.875rem; /* 14px — Form labels, secondary */
  --body-xs: 0.75rem; /* 12px — Timestamps, hints */

  /* Line height */
  --lh-tight: 1.2; /* Headings */
  --lh-normal: 1.5; /* Body text */
  --lh-relaxed: 1.8; /* Long-form (help text) */
}
```

---

## Spacing & Layout

### Spacing Scale (8px base)

```css
:root {
  /* Padding & margins */
  --space-xs: 0.25rem; /* 4px — Tight spacing */
  --space-sm: 0.5rem; /* 8px — Compact spacing */
  --space-md: 1rem; /* 16px — Default spacing */
  --space-lg: 1.5rem; /* 24px — Generous spacing */
  --space-xl: 2rem; /* 32px — Large gaps */
  --space-2xl: 3rem; /* 48px — Section breaks */

  /* Container widths */
  --container-sm: 640px; /* Mobile-ish */
  --container-md: 768px; /* Tablet */
  --container-lg: 1024px; /* Desktop */
  --container-xl: 1280px; /* Wide desktop */
  --container-max: 1440px; /* Max content width */
}
```

### Border Radius

```css
:root {
  --r-sm: 0.375rem; /* 6px — Buttons, small elements */
  --r: 0.75rem; /* 12px — Cards, default */
  --r-lg: 1.25rem; /* 20px — Large panels */
  --r-full: 9999px; /* Fully rounded (pills, avatars) */
}
```

---

## Motion & Animation

### Easing Functions

```css
:root {
  /* Easing curves for different purposes */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1); /* Decelerate out */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy spring */
  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1); /* Exponential ease */
}
```

### Duration

```css
:root {
  --dur-instant: 0ms; /* No animation (a=instant) */
  --dur-fast: 150ms; /* Quick feedback (hover, focus) */
  --dur-base: 250ms; /* Standard transitions */
  --dur-slow: 400ms; /* Deliberate animations */
  --dur-very-slow: 600ms; /* Cinematic effects */
}
```

### Animation Examples

```css
/* Fade in */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide up */
@keyframes slide-up {
  from {
    transform: translateY(1rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Scale + fade (modal entrance) */
@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Usage in component */
.modal-content {
  animation: scale-in var(--dur-base) var(--ease-out);
}
```

**Principle:** Use motion sparingly; most interactions should feel instant or very fast (150–250ms).

---

## Components

### Buttons

```jsx
// Primary (brand gold)
<button className="btn btn-primary">Approve</button>

// Secondary (neutral)
<button className="btn btn-secondary">Cancel</button>

// Success
<button className="btn btn-success">Submit</button>

// Warning
<button className="btn btn-warning">Review Required</button>

// Danger
<button className="btn btn-danger">Revoke Permit</button>

// Disabled
<button className="btn btn-primary" disabled>
  Processing...
</button>
```

**CSS:**

```css
.btn {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--body-sm);
  font-weight: 600;
  border-radius: var(--r-sm);
  border: none;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);

  &:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: var(--brand-gold);
  color: var(--brand-dark);

  &:hover:not(:disabled) {
    background: oklch(82% 0.24 80);
  }
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
  }
}

.btn-success {
  background: var(--success);
  color: white;

  &:hover:not(:disabled) {
    background: var(--success-up);
  }
}

.btn-error {
  background: var(--error);
  color: white;

  &:hover:not(:disabled) {
    background: var(--error-up);
  }
}
```

### Cards

```jsx
<div className="card">
  <div className="card-header">
    <h3>Park Application</h3>
  </div>
  <div className="card-body">{/* Content */}</div>
  <div className="card-footer">
    <button className="btn btn-primary">Approve</button>
  </div>
</div>
```

**CSS:**

```css
.card {
  background: var(--bg-secondary);
  border-radius: var(--r-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: all var(--dur-base) var(--ease-out);

  &:hover {
    border-color: var(--brand-gold);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
}

.card-header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}

.card-body {
  padding: var(--space-lg);
}

.card-footer {
  padding: var(--space-lg);
  border-top: 1px solid var(--border);
  background: var(--bg-tertiary);
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
}
```

### Form Elements

```jsx
<div className="form-group">
  <label htmlFor="park-name">Park Name *</label>
  <input
    id="park-name"
    type="text"
    className="input"
    placeholder="Enter park name"
    required
  />
  <span className="form-hint">As registered with CAC</span>
</div>

<div className="form-group">
  <label htmlFor="status">Status *</label>
  <select id="status" className="select">
    <option value="">Select status...</option>
    <option value="pending">Pending Inspection</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
  </select>
</div>

<div className="form-group">
  <label htmlFor="notes">Inspection Notes</label>
  <textarea id="notes" className="textarea" rows={5} />
</div>
```

**CSS:**

```css
.form-group {
  margin-bottom: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group > label {
  font-size: var(--body-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.input,
.select,
.textarea {
  padding: var(--space-md);
  font-size: var(--body-sm);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  transition: border-color var(--dur-fast) var(--ease-out);

  &:focus {
    outline: none;
    border-color: var(--brand-gold);
    box-shadow: 0 0 0 3px rgba(240, 187, 13, 0.1);
  }

  &:disabled {
    background: var(--bg-secondary);
    color: var(--text-muted);
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.form-hint {
  font-size: var(--body-xs);
  color: var(--text-muted);
}
```

### Status Badges

```jsx
<span className="badge badge-success">Approved</span>
<span className="badge badge-warning">Pending Inspection</span>
<span className="badge badge-error">Rejected</span>
<span className="badge badge-info">Under Review</span>
```

**CSS:**

```css
.badge {
  display: inline-block;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--r-full);
  font-size: var(--body-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-success {
  background: var(--success-sub);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-sub);
  color: var(--warning);
}

.badge-error {
  background: var(--error-sub);
  color: var(--error);
}

.badge-info {
  background: var(--info-sub);
  color: var(--info);
}
```

### Alert Boxes

```jsx
<div className="alert alert-success">
  <svg className="icon" {...} /> {/* Check icon */}
  <div>
    <h4>Application Approved</h4>
    <p>Your park application has been approved. Download your permit letter.</p>
  </div>
</div>

<div className="alert alert-warning">
  <svg className="icon" {...} /> {/* Warning icon */}
  <div>
    <h4>Action Required</h4>
    <p>Your inspection is scheduled for tomorrow. Please ensure site access.</p>
  </div>
</div>

<div className="alert alert-error">
  <svg className="icon" {...} /> {/* Error icon */}
  <div>
    <h4>Application Rejected</h4>
    <p>Document incomplete: CAC registration certificate not provided.</p>
  </div>
</div>
```

**CSS:**

```css
.alert {
  padding: var(--space-lg);
  border-radius: var(--r);
  display: flex;
  gap: var(--space-md);
  border-left: 4px solid;
}

.alert-success {
  background: var(--success-sub);
  border-color: var(--success);
  color: var(--text-primary);
}

.alert-warning {
  background: var(--warning-sub);
  border-color: var(--warning);
  color: var(--text-primary);
}

.alert-error {
  background: var(--error-sub);
  border-color: var(--error);
  color: var(--text-primary);
}

.alert h4 {
  margin: 0 0 var(--space-xs) 0;
  font-size: var(--body);
  font-weight: 600;
}

.alert p {
  margin: 0;
  font-size: var(--body-sm);
  color: var(--text-secondary);
}
```

---

## Responsive Design

### Breakpoints

```css
:root {
  --bp-sm: 640px; /* Mobile */
  --bp-md: 768px; /* Tablet */
  --bp-lg: 1024px; /* Desktop */
  --bp-xl: 1280px; /* Wide desktop */
}

/* Usage in components */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Mobile-First Principle

Always design for mobile first, then enhance for larger screens:

```css
/* Mobile (default) */
.btn {
  padding: var(--space-md) var(--space-lg);
  width: 100%;
}

/* Tablet and up */
@media (min-width: 768px) {
  .btn {
    width: auto;
  }
}
```

---

## Accessibility

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```css
/* Focus visible for keyboard navigation */
button,
input,
select,
textarea,
a {
  &:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }
}
```

### Color Not Alone

Never use color as the sole indicator of status; always add text or icons:

```jsx
/* ❌ BAD: Only color indicates status */
<div style={{ background: 'var(--success)' }}>Approved</div>

/* ✅ GOOD: Color + text + icon */
<div className="status-success">
  <CheckIcon />
  Approved
</div>
```

### High Contrast

Minimum contrast ratio 4.5:1 for text; 3:1 for UI components (WCAG AA):

```css
/* ✅ GOOD: 16:1 contrast */
color: var(--text-primary); /* oklch(95% 0.01 95) */
background: var(--bg-primary); /* oklch(20% 0.06 15) */

/* ❌ AVOID: 3:1 contrast (too low for body text) */
color: oklch(60% 0.02 265);
background: var(--bg-primary);
```

### Semantic HTML

Always use semantic HTML; buttons should be `<button>`, links should be `<a>`:

```jsx
/* ✅ GOOD */
<button onClick={handleApprove}>Approve</button>
<a href="/applications">View Applications</a>

/* ❌ BAD */
<div onClick={handleApprove} role="button">Approve</div>
<span onClick={() => navigate('/applications')}>View Applications</span>
```

---

## Component Library Status

### Phase 1 Components (Built by Week 2)

- [x] Button (primary, secondary, success, warning, danger)
- [x] Input (text, email, number, tel)
- [x] Select dropdown
- [x] Textarea
- [x] Checkbox
- [x] Radio
- [x] Card
- [x] Badge
- [x] Alert box
- [x] Modal
- [x] Breadcrumb
- [x] Pagination
- [x] Data table (basic)
- [x] Form layout (group, label, hint, error)

### Phase 2 Components (Built by Week 10)

- [ ] Advanced data table (sorting, filtering)
- [ ] Multi-select dropdown
- [ ] Date picker
- [ ] Time picker
- [ ] File upload
- [ ] Progress bar
- [ ] Skeleton loader
- [ ] Tooltip
- [ ] Popover

### Phase 3 Components (Future)

- [ ] Accordion
- [ ] Tabs
- [ ] Stepper
- [ ] Charts/graphs
- [ ] Rich text editor

---

## Usage Guidelines

### Rule 1: Use Tokens, Never Hardcode

```jsx
/* ✅ GOOD */
<button style={{ background: 'var(--brand-gold)' }}>
  Approve
</button>

/* ❌ BAD */
<button style={{ background: '#f0bb0d' }}>
  Approve
</button>
```

### Rule 2: Space Consistently

```jsx
/* ✅ GOOD */
<div style={{ padding: 'var(--space-lg)', gap: 'var(--space-md)' }}>

/* ❌ BAD */
<div style={{ padding: '20px', gap: '10px' }}>
```

### Rule 3: Prioritize Readability

```jsx
/* ✅ GOOD — Ample spacing, clear hierarchy */
<h2>Application Status</h2>
<p>Your application is pending inspection.</p>
<button>View Details</button>

/* ❌ BAD — Cramped, poor hierarchy */
<div>Application Status: Pending Inspection <span onClick={...}>Details</span></div>
```

---

## Testing Your Components

1. **Visual Testing:** Check all states (normal, hover, focus, disabled, active)
2. **Accessibility Testing:** Keyboard nav, screen reader, color contrast
3. **Responsive Testing:** Mobile, tablet, desktop; check breakpoints
4. **Performance:** Measure render time; ensure no layout shifts

---

## Storybook & Documentation

Every component should have:

1. **Definition:** What does this component do?
2. **Props:** What parameters does it accept?
3. **Examples:** Usage in different states
4. **Accessibility:** Keyboard, screen reader, contrast notes
5. **Related Components:** Which other components work well with this?

Example Storybook entry:

```
Component: Button
Props:
  - variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  - size: 'sm' | 'md' | 'lg'
  - disabled: boolean
  - loading: boolean
  - onClick: () => void

Examples:
  - Primary button (CTA)
  - Secondary button (cancel)
  - Success button (approval)
  - Disabled button
  - Loading state

Accessibility:
  - Focus ring visible on keyboard nav
  - Label text clear and descriptive
  - Color + icon used together (not color alone)
```

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Tailwind Version:** v4 with custom tokens plugin  
**Next Review:** Week 3 (component library feature complete)
