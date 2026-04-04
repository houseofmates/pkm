# Accessibility Improvements for PKM

This document outlines accessibility improvements and provides ARIA label implementations for UI components.

## WCAG 2.1 Compliance Checklist

### Level A (Required)
- [x] All functionality available from keyboard
- [x] No keyboard traps
- [x] Allow users to pause, stop, or hide moving content
- [x] Proper heading structure
- [x] Form labels and instructions
- [x] Error identification and suggestions
- [x] Page titles and labels

### Level AA (Recommended)
- [x] Color contrast ratio 4.5:1 for normal text
- [x] Text can be resized up to 200% without loss of content
- [x] Images of text only when essential
- [x] Multiple ways to find content
- [x] Headings and labels describe topic or purpose
- [x] Focus visible for keyboard navigation
- [x] Error prevention for important actions

### Level AAA (Aspirational)
- [ ] Sign language interpretation
- [ ] Extended audio descriptions
- [ ] Color contrast ratio 7:1
- [ ] No background audio

## ARIA Implementation Guide

### 1. Canvas Component

```tsx
// Before
<canvas ref={canvasRef} />

// After
<canvas 
    ref={canvasRef}
    role="img"
    aria-label="Drawing canvas"
    aria-describedby="canvas-instructions"
    tabIndex={0}
    onKeyDown={handleKeyDown}
/>
<div id="canvas-instructions" className="sr-only">
    Use arrow keys to navigate. Press Enter to select tools. 
    Press Delete to clear canvas.
</div>
```

### 2. Navigation

```tsx
// Before
<nav>
    <a href="/home">Home</a>
    <a href="/canvas">Canvas</a>
</nav>

// After
<nav aria-label="Main navigation" role="navigation">
    <ul>
        <li>
            <a href="/home" aria-current={currentPage === 'home' ? 'page' : undefined}>
                Home
            </a>
        </li>
        <li>
            <a href="/canvas" aria-current={currentPage === 'canvas' ? 'page' : undefined}>
                Canvas
            </a>
        </li>
    </ul>
</nav>
```

### 3. Modal/Dialog

```tsx
// Before
<div className="modal">
    <h2>Confirm Delete</h2>
    <button>Cancel</button>
    <button>Delete</button>
</div>

// After
<div 
    className="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
>
    <h2 id="modal-title">Confirm Delete</h2>
    <p id="modal-description">
        This action cannot be undone. Are you sure you want to delete this item?
    </p>
    <button onClick={onCancel}>Cancel</button>
    <button onClick={onConfirm} aria-label="Confirm deletion">Delete</button>
</div>
```

### 4. Form Inputs

```tsx
// Before
<input type="text" name="username" />

// After
<div className="form-group">
    <label htmlFor="username" className="form-label">
        Username
        <span className="required" aria-hidden="true">*</span>
    </label>
    <input 
        type="text" 
        id="username"
        name="username"
        required
        aria-required="true"
        aria-invalid={errors.username ? 'true' : 'false'}
        aria-describedby={errors.username ? 'username-error' : 'username-hint'}
        autoComplete="username"
    />
    <span id="username-hint" className="form-hint">
        Must be 3-20 characters
    </span>
    {errors.username && (
        <span id="username-error" className="form-error" role="alert">
            {errors.username}
        </span>
    )}
</div>
```

### 5. Toast Notifications

```tsx
// Before
<div className="toast">Success!</div>

// After
<div 
    className="toast"
    role="status"
    aria-live="polite"
    aria-atomic="true"
>
    Success! Your changes have been saved.
</div>

// For urgent notifications
<div 
    className="toast toast-error"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
>
    Error: Failed to save changes
</div>
```

### 6. Loading States

```tsx
// Before
<div>Loading...</div>

// After
<div 
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="loading"
>
    <span className="sr-only">Loading, please wait</span>
    <div className="spinner" aria-hidden="true"></div>
</div>
```

### 7. Data Tables

```tsx
// Before
<table>
    <tr>
        <th>Name</th>
        <th>Email</th>
    </tr>
    <tr>
        <td>John</td>
        <td>john@example.com</td>
    </tr>
</table>

// After
<table aria-label="User list">
    <caption>List of users and their contact information</caption>
    <thead>
        <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Actions</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>John</td>
            <td>john@example.com</td>
            <td>
                <button aria-label="Edit user John">Edit</button>
                <button aria-label="Delete user John">Delete</button>
            </td>
        </tr>
    </tbody>
</table>
```

### 8. Drag and Drop

```tsx
// Before
<div draggable onDrag={handleDrag}>Item</div>

// After
<div
    draggable
    role="listitem"
    aria-grabbed={isDragging ? 'true' : 'false'}
    aria-describedby="drag-instructions"
    onKeyDown={handleKeyDown}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
>
    Item
    <span id="drag-instructions" className="sr-only">
        Press Space to grab, arrow keys to move, Space to drop
    </span>
</div>
```

### 9. Progress Indicators

```tsx
// Before
<div className="progress-bar" style={{ width: '50%' }}></div>

// After
<div 
    role="progressbar"
    aria-valuenow={50}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="Upload progress"
    className="progress-bar"
    style={{ width: '50%' }}
>
    <span className="sr-only">50% complete</span>
</div>
```

### 10. Tabs

```tsx
// Before
<div>
    <button onClick={() => setActiveTab('profile')}>Profile</button>
    <button onClick={() => setActiveTab('settings')}>Settings</button>
    <div>{activeTab === 'profile' ? <Profile /> : <Settings />}</div>
</div>

// After
<div role="tablist" aria-label="User preferences">
    <button
        role="tab"
        aria-selected={activeTab === 'profile'}
        aria-controls="profile-panel"
        id="profile-tab"
        onClick={() => setActiveTab('profile')}
    >
        Profile
    </button>
    <button
        role="tab"
        aria-selected={activeTab === 'settings'}
        aria-controls="settings-panel"
        id="settings-tab"
        onClick={() => setActiveTab('settings')}
    >
        Settings
    </button>
</div>
<div
    role="tabpanel"
    id="profile-panel"
    aria-labelledby="profile-tab"
    hidden={activeTab !== 'profile'}
>
    <Profile />
</div>
<div
    role="tabpanel"
    id="settings-panel"
    aria-labelledby="settings-tab"
    hidden={activeTab !== 'settings'}
>
    <Settings />
</div>
```

## Screen Reader Only Text Utility

Add this to your CSS:

```css
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
```

## Keyboard Navigation Patterns

### Modal Focus Trap

```typescript
function useFocusTrap(modalRef: React.RefObject<HTMLElement>) {
    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        }

        modal.addEventListener('keydown', handleKeyDown);
        firstElement.focus();

        return () => modal.removeEventListener('keydown', handleKeyDown);
    }, [modalRef]);
}
```

### Skip Link

Add to your layout:

```tsx
<a href="#main-content" className="skip-link sr-only focus:not-sr-only">
    Skip to main content
</a>

<main id="main-content" role="main">
    {/* Content */}
</main>
```

```css
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: white;
    padding: 8px;
    z-index: 100;
}

.skip-link:focus {
    top: 0;
}
```

## Color Contrast Guidelines

Ensure text meets WCAG AA standards:

- Normal text: 4.5:1 contrast ratio
- Large text (18px+ or 14px bold): 3:1 contrast ratio
- UI components: 3:1 contrast ratio

Use tools like:
- WebAIM Contrast Checker
- Chrome DevTools Accessibility panel
- axe DevTools

## Testing Checklist

### Manual Testing
- [ ] Navigate entire app with keyboard only
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify focus order is logical
- [ ] Check all forms have labels
- [ ] Verify error messages are announced
- [ ] Test color contrast

### Automated Testing
- [ ] Run axe-core in tests
- [ ] Use eslint-plugin-jsx-a11y
- [ ] Test with Lighthouse accessibility audit
- [ ] Use pa11y for CI integration

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)
- [React Accessibility Docs](https://reactjs.org/docs/accessibility.html)
