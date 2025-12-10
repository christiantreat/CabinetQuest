# CLAUDE.md - CabinetQuest Development Guide

> Comprehensive guide for AI assistants working with the CabinetQuest (Trauma Room Trainer) codebase

## Table of Contents
- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Architecture & Technology Stack](#architecture--technology-stack)
- [Key Components & Code Organization](#key-components--code-organization)
- [Development Workflow](#development-workflow)
- [Coding Conventions & Best Practices](#coding-conventions--best-practices)
- [Common Tasks & Operations](#common-tasks--operations)
- [Git Workflow](#git-workflow)
- [Important Notes & Gotchas](#important-notes--gotchas)

---

## Project Overview

**CabinetQuest** (branded as "Trauma Room Trainer") is an interactive educational web application designed to train medical professionals on the location and proper selection of emergency equipment in trauma rooms.

### Purpose
- Teach trauma room equipment organization through gamified scenarios
- Practice emergency preparedness in a risk-free virtual environment
- Track learning progress through achievements and scoring

### Application Type
Single-page web application (SPA) with no build process, frameworks, or external dependencies

### Target Audience
- Medical students
- Healthcare professionals
- Emergency room staff training programs

---

## Repository Structure

```
CabinetQuest/
├── index.html          # Complete application (HTML + CSS + JS)
├── images/             # Medical equipment image assets
│   └── imgs           # Placeholder file
└── CLAUDE.md          # This file
```

### File Breakdown

**index.html** (2662 lines, ~95KB)
- Lines 1-1332: HTML structure + CSS styles
- Lines 1333-1419: Data definitions (carts, drawers, items, scenarios)
- Lines 1420-1451: State management
- Lines 1452-1665: Canvas rendering logic
- Lines 1666-1734: Scenario management
- Lines 1735-2011: Cart/drawer/inventory navigation
- Lines 2012-2329: Feedback & scoring system
- Lines 2330-2374: Gamification (achievements, points)
- Lines 2375-2451: Audio & haptics
- Lines 2452-2508: Settings management
- Lines 2509-2527: Statistics tracking
- Lines 2528-2554: Persistence (localStorage)
- Lines 2555-2573: Analytics
- Lines 2574-2578: Modal dialogs
- Lines 2579-2637: Tutorial system
- Lines 2638-2662: Initialization

---

## Architecture & Technology Stack

### Technology Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Core** | Vanilla JavaScript (ES6+) | Application logic |
| **UI** | HTML5 + CSS3 | Layout and styling |
| **Graphics** | Canvas API | Trauma room visualization |
| **Audio** | Web Audio API | Sound effects (data URIs) |
| **Haptics** | Vibration API | Touch feedback |
| **Storage** | localStorage | Progress persistence |
| **Responsive** | CSS Flexbox + Media Queries | Mobile-first design |

### No External Dependencies
- **No frameworks** (React, Vue, Angular)
- **No bundlers** (Webpack, Vite, Parcel)
- **No package managers** (npm, yarn)
- **No CSS preprocessors** (Sass, Less)
- Pure browser-native APIs only

### Design Patterns
- **Event-driven architecture**: Button clicks, canvas interactions
- **State management**: Single global `state` object
- **Data-driven rendering**: Static `DATA` object defines all content
- **Progressive disclosure**: Tutorial → Scenarios → Achievements
- **Responsive design**: Mobile-first with viewport-based sizing

---

## Key Components & Code Organization

### 1. Data Layer (Lines 1333-1419)

**DATA Object** (Static medical reference data)
```javascript
DATA = {
  carts: [5 carts]        // Airway, Medication, Code, Trauma, Procedure Table
  drawers: [12 drawers]   // 3 per cart (top/middle/bottom)
  items: [24 items]       // Medical equipment mapped to drawers
  scenarios: [5 scenarios] // Medical emergency cases
}
```

**State Object** (Dynamic application state)
```javascript
state = {
  currentScenario: null,
  inventory: [],
  completedScenarios: [],
  scenariosUnlocked: 1,
  points: 0,
  totalPoints: 0,
  achievements: [],
  soundEnabled: true,
  hapticEnabled: true,
  sessionResults: []
}
```

### 2. Canvas Rendering System (Lines 1452-1665)

**Key Functions:**
- `resizeCanvas()`: DPR-aware canvas sizing for crisp rendering on mobile
- `drawRoom()`: Renders entire trauma room with carts
- `drawCartWithDrawers()`: 3D-style cart visualization with drawer fronts
- `handleCanvasInteraction()`: Touch/click event processing

**Mobile Optimization:**
- Device Pixel Ratio (DPR) handling for retina displays
- Touch event alignment compensation
- Responsive sizing based on viewport

### 3. Scenario System (Lines 1666-1734)

**5 Medical Scenarios:**
1. **Cardiac Arrest**: Defibrillator, ECG, Epinephrine, Amiodarone
2. **Airway Obstruction**: Laryngoscope, ETT, BVM, Suction
3. **Severe Trauma**: Gauze, Tourniquet, Chest Tube, IV Start
4. **Anaphylaxis**: Epinephrine, Oxygen, BVM, IV Start
5. **Overdose**: Naloxone, BVM, Oxygen, IV Start

**Progressive Unlock:**
- Only 1 scenario unlocked initially
- New scenarios unlock upon completion

### 4. Navigation Flow (Lines 1735-2011)

**User Journey:**
```
Room View → Tap Cart → Drawer Selection → Item Selection → Inventory → Submit
```

**Key Functions:**
- `openCart()`: Shows drawer selection UI
- `openDrawer()`: Displays items in drawer
- `toggleItemSelection()`: Add/remove items
- `collectSelectedItems()`: Move to inventory
- `openInventoryModal()`: View collected items
- `submitInventory()`: Score against scenario

### 5. Scoring System (Lines 2012-2329)

**Scoring Formula:**
- Essential items: +60 points each
- Optional items: +20 points each
- Extra items: -5 points each

**Star Rating (1-5 stars):**
- 5 stars: All essential + fast time (< 30s) + no extras
- 4 stars: All essential + reasonable time
- 3 stars: All essential items found
- 2 stars: Most essential items (≥ 75%)
- 1 star: Some essential items (≥ 50%)
- 0 stars: Missing critical items (< 50%)

**Feedback Types:**
- Success: All essential items collected
- Partial: Missing some essential items
- Error: Missing critical items

### 6. Gamification (Lines 2330-2374)

**6 Achievements:**
- First Steps: Complete first scenario
- Perfectionist: Perfect score on any scenario
- Speed Demon: Complete in < 30 seconds
- Efficiency Expert: Perfect score with no extras
- Getting the Hang of It: Complete 3 scenarios
- Master Trainer: Complete all 5 scenarios

**Points System:**
- Session points (current scenario)
- Total lifetime points (persistent)
- Leaderboard tracking via sessionResults

### 7. Audio & Haptics (Lines 2375-2451)

**Sound Effects:**
- Click sounds (drawer open/close)
- Item collect sound
- Success/error feedback
- All audio stored as base64 data URIs

**Haptic Patterns:**
- Light tap: 10ms
- Medium tap: 25ms
- Heavy tap: 50ms
- Pattern: [25, 10, 25] for special events

### 8. Persistence (Lines 2528-2573)

**localStorage Keys:**
- `traumaRoomProgress`: User progress (completedScenarios, points, achievements)
- `analytics`: Session results array

**Saved Data:**
```javascript
{
  completedScenarios: ['s1', 's2'],
  scenariosUnlocked: 3,
  totalPoints: 450,
  achievements: ['first-scenario', 'speed-demon'],
  tutorialCompleted: true,
  soundEnabled: true,
  hapticEnabled: true
}
```

### 9. Tutorial System (Lines 2579-2637)

**6-Step Tutorial:**
1. Welcome & overview
2. Tap carts to open
3. Select drawer
4. Choose items
5. Review inventory
6. Submit for scoring

**Auto-trigger:** Shows on first visit (when `tutorialCompleted === false`)

---

## Development Workflow

### Environment Setup
**No build process required!**
```bash
# Simply open in browser
open index.html

# Or use a local server for testing
python -m http.server 8000
# Then visit: http://localhost:8000
```

### Development Process
1. Edit `index.html` directly
2. Refresh browser to see changes
3. Use browser DevTools for debugging
4. Test on mobile devices/emulators

### File Editing Guidelines

**When making changes:**
- Always read the entire relevant section first
- Maintain consistent indentation (4 spaces)
- Preserve existing code structure
- Test changes immediately in browser

**Critical sections to be careful with:**
- Canvas rendering (DPR calculations)
- Touch event handling (mobile alignment)
- localStorage persistence (data migration)
- Audio context (browser autoplay restrictions)

---

## Coding Conventions & Best Practices

### JavaScript Style

**Function Naming:**
```javascript
// Action-based verb-noun pattern
function openCart(cart) { }
function submitInventory() { }
function awardPoints(points, message) { }
```

**State Management:**
```javascript
// Always update state object directly
state.inventory.push(item);
state.currentScenario = scenario;

// Trigger saves after state changes
saveUserProgress();
```

**Event Handling:**
```javascript
// Use arrow functions for event listeners
button.addEventListener('click', () => {
    // Handler code
});
```

### CSS Conventions

**Class Naming:**
- BEM-like structure: `.component-element-modifier`
- Examples: `.scenario-action-btn`, `.drawer-visual`, `.cart-label`

**Mobile-First:**
- Base styles for mobile
- Media queries for larger screens
- Touch-friendly hit targets (min 44px)

**Colors:**
- Carts: Green (#4CAF50), Blue (#2196F3), Red (#F44336), Orange (#FF9800), Purple (#9C27B0)
- Success: #28a745
- Warning: #ffc107
- Error: #dc3545

### HTML Structure

**Modal Pattern:**
```html
<div id="modal-name" class="modal">
    <div class="modal-content">
        <div class="modal-header"><!-- Title --></div>
        <div class="modal-body"><!-- Content --></div>
        <div class="modal-footer"><!-- Actions --></div>
    </div>
</div>
```

---

## Common Tasks & Operations

### Adding a New Scenario

1. **Add to DATA.scenarios array** (around line 1382):
```javascript
{
    id: 's6',
    name: 'New Emergency',
    description: 'Description of the emergency',
    essential: ['item1', 'item2'],
    optional: ['item3']
}
```

2. **Update scenario count references** if needed
3. **Test with existing items** or add new items first

### Adding New Medical Equipment

1. **Add to DATA.items array** (around line 1356):
```javascript
{
    id: 'new-item',
    name: 'Item Name',
    cart: 'trauma',
    drawer: 'd10',
    image: 'images/new-item.jpg'
}
```

2. **Add image file** to `/images/` directory
3. **Reference in scenarios** as needed

### Adding a New Achievement

1. **Add to achievements array** (around line 1422):
```javascript
{
    id: 'new-achievement',
    title: 'Title',
    description: 'Description',
    icon: '🎖️'
}
```

2. **Add check logic** in `checkAchievement()` function:
```javascript
if (/* condition */) {
    checkAchievement('new-achievement');
}
```

### Modifying Scoring Logic

**Location:** `submitInventory()` function (around line 2013)

**Scoring variables:**
```javascript
const essentialPoints = 60;  // Points per essential item
const optionalPoints = 20;   // Points per optional item
const extraPenalty = -5;     // Penalty per extra item
```

### Adjusting Canvas Rendering

**Location:** `drawRoom()` and `drawCartWithDrawers()` (lines 1562+)

**Key variables:**
```javascript
canvasDPR        // Device pixel ratio
canvasWidth      // Logical canvas width
canvasHeight     // Logical canvas height
```

**When modifying:**
- Always multiply coordinates by `canvasDPR` for crisp rendering
- Test on mobile devices (iOS Safari has specific quirks)
- Verify touch alignment with `handleCanvasInteraction()`

---

## Git Workflow

### Branch Naming Convention
All Claude-assisted development branches follow this pattern:
```
claude/<description>-<session-id>
```

**Examples:**
- `claude/testing-mj0iv4xp8ggzd9iv-01XMXE26vWHYPW9zNpsymS91`
- `claude/claude-md-mj0jk4tsukufi7og-01WFtTs7RCxpXm9UnWKAUQed`

### Commit Message Style

**Pattern observed:**
- Imperative mood ("Fix", "Add", "Update", "Enhance")
- Concise (< 72 characters)
- Focus on "what" not "how"

**Examples:**
```
Fix missing newline at end of index.html
Enhance cart UI with visual drawers
Implement Device Pixel Ratio (DPR) handling for crisp canvas rendering
Improve tutorial and UX with major mobile enhancements
```

### Development Flow

1. **Branch creation:** Auto-created with session ID
2. **Iterative commits:** Small, focused changes
3. **Push to branch:** `git push -u origin <branch-name>`
4. **Pull request:** Merged via GitHub PR (examples: #18, #19)
5. **Merge to main:** Squash or merge commits

### Git Commands Reference

```bash
# Check status
git status

# Stage changes
git add index.html

# Commit with message
git commit -m "Fix canvas alignment issue"

# Push to remote
git push -u origin claude/<branch-name>

# View history
git log --oneline -20
```

---

## Important Notes & Gotchas

### 1. Mobile Safari Specifics

**Issue:** Canvas touch events can be misaligned
**Solution:** DPR-aware coordinate transformation in `handleCanvasInteraction()`

**Issue:** Audio autoplay restrictions
**Solution:** `getAudioContext()` creates context on first user interaction

### 2. localStorage Limitations

**Size limit:** ~5-10MB depending on browser
**Data format:** JSON serialization only
**Migration:** When changing state structure, provide migration logic in `loadUserProgress()`

**Example migration:**
```javascript
if (!savedData.version) {
    // Migrate old data format
    savedData.version = 2;
    savedData.newField = defaultValue;
}
```

### 3. Image Asset Management

**Current state:** Images referenced but may not exist
**Fallback:** App works without images (shows item names only)
**Adding images:** Place in `/images/` directory with exact filename from `DATA.items`

**Image format recommendations:**
- Format: JPG or PNG
- Size: 200x200px recommended
- Naming: Match `DATA.items[].image` exactly

### 4. Performance Considerations

**Canvas redraw:** Only on state changes, not on every frame
**Event throttling:** Consider debouncing rapid touch events if performance issues arise
**Asset loading:** Images loaded lazily when drawers opened

### 5. Testing Checklist

When making changes, test:
- [ ] Desktop Chrome/Firefox/Safari
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS) - especially canvas/touch
- [ ] Tablet form factors
- [ ] Landscape and portrait orientations
- [ ] Sound on/off states
- [ ] localStorage persistence (clear and reload)
- [ ] Tutorial flow for new users
- [ ] All 5 scenarios playable
- [ ] Achievement unlocking
- [ ] Settings changes persist

### 6. Common Debugging Tips

**Canvas not rendering:**
```javascript
console.log('DPR:', canvasDPR);
console.log('Canvas size:', canvasWidth, canvasHeight);
```

**Touch events not working:**
```javascript
// Check touch coordinates
console.log('Touch:', { x: scaledX, y: scaledY });
```

**State not persisting:**
```javascript
// Verify localStorage
console.log(localStorage.getItem('traumaRoomProgress'));
```

**Audio not playing:**
```javascript
// Check audio context state
console.log('Audio context:', getAudioContext().state);
```

### 7. File Size Considerations

**Current:** ~95KB (all in one file)
**When to split:**
- If file exceeds 150KB
- If adding extensive new features
- Consider splitting CSS/JS into separate files

**How to split (if needed):**
```html
<link rel="stylesheet" href="styles.css">
<script src="app.js"></script>
```

### 8. Browser Compatibility

**Minimum requirements:**
- ES6 support (const, arrow functions, template literals)
- Canvas API
- localStorage
- Web Audio API
- Vibration API (optional, graceful degradation)

**Tested browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 13+)
- Chrome Mobile

---

## Development Principles for AI Assistants

### When Making Changes

1. **Read before writing**: Always read the relevant section completely before making edits
2. **Maintain structure**: Preserve existing code organization and patterns
3. **Test thoroughly**: Changes should be tested in browser immediately
4. **Mobile-first**: Consider mobile implications for all UI changes
5. **Preserve state**: Ensure localStorage compatibility when changing state structure

### Code Quality Standards

- **No console.logs in production**: Remove debugging statements
- **Error handling**: Wrap risky operations in try-catch
- **Graceful degradation**: Features should fail silently if APIs unavailable
- **Accessibility**: Maintain ARIA labels and semantic HTML
- **Performance**: Minimize DOM manipulation, batch canvas redraws

### Communication Guidelines

When explaining changes:
- Reference line numbers for context
- Explain "why" not just "what"
- Note any breaking changes
- Document new features in commit messages
- Update this CLAUDE.md if architecture changes

---

## Quick Reference

### Key File Locations
| Feature | Line Range |
|---------|-----------|
| Medical data | 1333-1419 |
| Canvas rendering | 1452-1665 |
| Scenarios | 1666-1734 |
| Scoring | 2012-2329 |
| Achievements | 2330-2374 |
| Audio/Haptics | 2375-2451 |
| Persistence | 2528-2573 |
| Tutorial | 2579-2637 |

### Important Functions
| Function | Purpose | Line |
|----------|---------|------|
| `drawRoom()` | Render trauma room | ~1562 |
| `handleCanvasInteraction()` | Process touch/click | ~1613 |
| `submitInventory()` | Score scenario | ~2013 |
| `saveUserProgress()` | Persist to localStorage | ~2529 |
| `loadUserProgress()` | Load from localStorage | ~2541 |

### State Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `state.currentScenario` | Object | Active scenario |
| `state.inventory` | Array | Collected items |
| `state.completedScenarios` | Array | Completed scenario IDs |
| `state.points` | Number | Session points |
| `state.totalPoints` | Number | Lifetime points |

---

## Version History

- **2025-12-10**: Initial CLAUDE.md creation
- Document reflects current state of index.html (2662 lines)
- Based on commit: `2e0eb21 Fix missing newline at end of index.html`

---

## Additional Resources

- **Repository**: christiantreat/CabinetQuest
- **Main file**: index.html (2662 lines)
- **No external docs**: All documentation in this file

---

**Last Updated**: 2025-12-10
**Maintained by**: AI assistants working on CabinetQuest
**Review**: Update this file when architecture changes significantly
