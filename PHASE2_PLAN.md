# 🎨 Phase 2: UI Transformation - Implementation Plan

**Goal:** Transform the dashboard into an IDE-like interface with sidebar, properties panel, and tabbed views.

**Status:** 🚧 In Progress
**Started:** January 12, 2026

---

## 📋 Master Checklist (10 Tasks)

### **Layout & Structure** (4 tasks)
- [ ] **Task 1:** Create IDE-like dashboard layout with sidebar
- [ ] **Task 2:** Build Project Explorer component (sheet tree view)
- [ ] **Task 3:** Build Properties Panel component (element editing)
- [ ] **Task 4:** Add command bar at bottom

### **Views & Navigation** (1 task)
- [ ] **Task 5:** Implement tabbed interface (Chat / 2D View / Code Check)

### **Component Migration** (3 tasks)
- [ ] **Task 6:** Migrate ChatInterface to use Zustand store
- [ ] **Task 7:** Migrate PlanCanvas to use Zustand store
- [ ] **Task 8:** Update PlanCanvas to render new BlueprintData structure

### **Polish & Testing** (2 tasks)
- [ ] **Task 9:** Integrate JetBrains Mono typography
- [ ] **Task 10:** Test complete Phase 2 integration

---

## 🎯 Original Master Prompt Requirements

### **From Master Prompt - Dashboard Structure:**

```
Dashboard (app/dashboard/page.tsx)
├── Sidebar (Left - 250px)
│   ├── Project Explorer: Tree view of Sheets (A-101, A-201)
│   └── Properties Panel: Context-aware details
│
├── Main Viewport
│   ├── Tabs: "Chat", "2D View", "Code Check"
│   └── Canvas: Interactive rendering area
│
└── Command Bar (Bottom)
    └── Text input for AI Architect commands
```

### **Design System Requirements:**
- **Theme:** Deep Zinc (bg-zinc-950)
- **Typography:**
  - JetBrains Mono for dimensions/data
  - Inter for UI
- **Accents:**
  - Selection: Cyan (#22d3ee)
  - Error/Compliance: Red-500 (#ef4444)
  - Wall Lines: White (#ffffff)

---

## 📐 Detailed Task Breakdown

### **Task 1: IDE-like Dashboard Layout** ⏱️ Est: 30 min

**Files to Create/Modify:**
- `src/app/dashboard/page.tsx` (major refactor)

**Layout Structure:**
```
┌─────────────────────────────────────────────┐
│            Top Bar (Project Title)          │
├───────────┬─────────────────────────────────┤
│           │  Tabs: Chat | 2D View | Checks  │
│           ├─────────────────────────────────┤
│  Sidebar  │                                 │
│  250px    │         Main Viewport           │
│           │      (Active Tab Content)       │
│  ┌──────┐ │                                 │
│  │ Tree │ │                                 │
│  └──────┘ │                                 │
│  ┌──────┐ │                                 │
│  │Props │ │                                 │
│  └──────┘ │                                 │
├───────────┴─────────────────────────────────┤
│         Command Bar (Input + Actions)       │
└─────────────────────────────────────────────┘
```

**Implementation:**
```tsx
<div className="h-screen flex flex-col bg-zinc-950">
  {/* Top Bar */}
  <header className="h-12 border-b border-zinc-800">
    <ProjectTitle />
  </header>

  <div className="flex flex-1 overflow-hidden">
    {/* Sidebar */}
    <aside className="w-[250px] border-r border-zinc-800">
      <ProjectExplorer />
      <PropertiesPanel />
    </aside>

    {/* Main Area */}
    <main className="flex-1 flex flex-col">
      <TabBar />
      <TabContent />
    </main>
  </div>

  {/* Command Bar */}
  <footer className="h-16 border-t border-zinc-800">
    <CommandBar />
  </footer>
</div>
```

**Progress:** 0/1 ☐

---

### **Task 2: Project Explorer Component** ⏱️ Est: 45 min

**File:** `src/components/architect/ProjectExplorer.tsx`

**Features:**
- Tree view of all sheets
- Active sheet highlighting (cyan border)
- Click to switch sheets
- Add/Remove sheet buttons
- Sheet icons (📄)

**UI Mockup:**
```
┌─────────────────────────┐
│ 📁 Project              │
│                         │
│ ├─ 📄 A-101 Floor Plan ←│ (active - cyan)
│ ├─ 📄 A-201 Elevations  │
│ └─ 📄 A-301 Sections    │
│                         │
│ [+ New Sheet]           │
└─────────────────────────┘
```

**State Integration:**
```tsx
const { blueprint, activeSheetIndex, setActiveSheet, addSheet, removeSheet }
  = useBlueprintStore();
```

**Progress:** 0/1 ☐

---

### **Task 3: Properties Panel Component** ⏱️ Est: 60 min

**File:** `src/components/architect/PropertiesPanel.tsx`

**Features:**
- Display selected element details
- Editable fields:
  - Wall: thickness, material, type
  - Opening: width, height, tag, swing
  - Room: area, flooring, ceiling height
- Save button with validation
- No selection state (shows instructions)

**UI Mockup:**
```
┌─────────────────────────┐
│ Properties              │
├─────────────────────────┤
│ Wall w3                 │
│                         │
│ Thickness: [0.5] m      │
│ Material:  [Brick ▼]    │
│ Type:      [Ext. ▼]     │
│ External:  ☑            │
│                         │
│      [Update Wall]      │
└─────────────────────────┘
```

**State Integration:**
```tsx
const {
  selectedElementId,
  selectedElementType,
  getSelectedElement,
  updateWall,
  updateOpening,
  updateRoom
} = useBlueprintStore();
```

**Progress:** 0/1 ☐

---

### **Task 4: Command Bar** ⏱️ Est: 30 min

**File:** `src/components/architect/CommandBar.tsx`

**Features:**
- Text input for AI commands
- Quick action buttons:
  - 🔍 Zoom Fit
  - 📐 Show Dimensions
  - 📊 Compliance Report
  - 💾 Save Project
- Status indicator (generating/idle)

**UI Mockup:**
```
┌──────────────────────────────────────────────┐
│ > [Type AI command...]            [🔍][📐][💾]│
└──────────────────────────────────────────────┘
```

**State Integration:**
```tsx
const { isGenerating, setBlueprint } = useBlueprintStore();
```

**Progress:** 0/1 ☐

---

### **Task 5: Tabbed Interface** ⏱️ Est: 45 min

**File:** `src/components/architect/TabBar.tsx`

**Features:**
- Three tabs: Chat | 2D View | Code Check
- Active tab highlighting (cyan underline)
- Tab content switching

**UI Mockup:**
```
┌────────┬────────┬────────────┐
│  Chat  │ 2D View│ Code Check │ ← Active: cyan underline
└────────┴────────┴────────────┘
```

**Tab Contents:**
- **Chat:** Existing ChatInterface
- **2D View:** Existing PlanCanvas
- **Code Check:** New ComplianceView component

**State:**
```tsx
const [activeTab, setActiveTab] = useState<'chat' | '2d' | 'compliance'>('chat');
```

**Progress:** 0/1 ☐

---

### **Task 6: Migrate ChatInterface** ⏱️ Est: 30 min

**File:** `src/components/architect/ChatInterface.tsx`

**Changes:**
```diff
- const [isGenerating, setIsGenerating] = useState(false);
+ const { isGenerating, setIsGenerating, setBlueprint } = useBlueprintStore();

- onFloorPlanGenerated(data.floorPlan);
+ setBlueprint(data.blueprint);
```

**Progress:** 0/1 ☐

---

### **Task 7: Migrate PlanCanvas** ⏱️ Est: 30 min

**File:** `src/components/architect/PlanCanvas.tsx`

**Changes:**
```diff
- const [zoom, setZoom] = useState(1);
- const [showGrid, setShowGrid] = useState(true);
+ const { zoom, setZoom, showGrid, setShowGrid } = useBlueprintStore();

- floorPlan: FloorPlanData | null
+ const activeSheet = useActiveSheet();
+ const walls = useWalls();
+ const openings = useOpenings();
+ const rooms = useRooms();
```

**Progress:** 0/1 ☐

---

### **Task 8: Update PlanCanvas Rendering** ⏱️ Est: 60 min

**File:** `src/components/architect/PlanCanvas.tsx`

**Changes:**
- Render from `sheet.elements.walls` (not `floorPlan.walls`)
- Handle multi-sheet switching
- Update compliance panel to use new `ComplianceReport` schema
- Add sheet metadata display (sheet number, scale)

**New Rendering Logic:**
```tsx
const activeSheet = useActiveSheet();
if (!activeSheet) return <EmptyState />;

// Render from activeSheet.elements
{activeSheet.elements.walls.map(wall => (...))}
{activeSheet.elements.openings.map(opening => (...))}
{activeSheet.elements.rooms.map(room => (...))}
```

**Progress:** 0/1 ☐

---

### **Task 9: JetBrains Mono Typography** ⏱️ Est: 15 min

**Files:**
- `src/app/layout.tsx` (add font import)
- `src/app/globals.css` (update font family)

**Changes:**
```tsx
// layout.tsx
import { JetBrains_Mono } from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});
```

```css
/* globals.css */
--font-data: var(--font-jetbrains-mono);

.dimension-text {
  font-family: var(--font-data);
}
```

**Progress:** 0/1 ☐

---

### **Task 10: Integration Testing** ⏱️ Est: 30 min

**Test Scenarios:**
1. ✅ Open dashboard → IDE layout renders
2. ✅ Switch between tabs → Content changes
3. ✅ Click sheet in explorer → Canvas updates
4. ✅ Select element → Properties panel populates
5. ✅ Edit property → Store updates + canvas re-renders
6. ✅ Send AI message → Blueprint updates
7. ✅ Undo/Redo → History works
8. ✅ Zoom/Pan → Persists across tab switches

**Progress:** 0/8 ☐

---

## 📊 Progress Tracking

### Overall Progress: 0/10 tasks (0%)

```
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

### By Category:
- Layout & Structure: 0/4 (0%)
- Views & Navigation: 0/1 (0%)
- Component Migration: 0/3 (0%)
- Polish & Testing: 0/2 (0%)

### Estimated Time:
- **Total:** ~6 hours
- **Completed:** 0 hours
- **Remaining:** ~6 hours

---

## 🎨 Design Tokens

```css
/* Colors */
--bg-primary: #09090b;     /* zinc-950 */
--bg-secondary: #18181b;   /* zinc-900 */
--border: #27272a;         /* zinc-800 */
--accent: #22d3ee;         /* cyan-400 */
--error: #ef4444;          /* red-500 */
--text-primary: #fafafa;   /* zinc-50 */
--text-secondary: #a1a1aa; /* zinc-400 */

/* Typography */
--font-ui: 'Inter', sans-serif;
--font-data: 'JetBrains Mono', monospace;

/* Spacing */
--sidebar-width: 250px;
--topbar-height: 48px;
--commandbar-height: 64px;
```

---

## 🔄 Component Hierarchy (After Phase 2)

```
app/dashboard/page.tsx
├── TopBar
│   ├── ProjectTitle
│   └── QuickActions
│
├── Sidebar (250px)
│   ├── ProjectExplorer
│   │   ├── SheetTree
│   │   └── AddSheetButton
│   │
│   └── PropertiesPanel
│       ├── WallProperties
│       ├── OpeningProperties
│       └── RoomProperties
│
├── MainViewport
│   ├── TabBar
│   │   ├── ChatTab
│   │   ├── TwoDViewTab
│   │   └── CodeCheckTab
│   │
│   └── TabContent
│       ├── ChatInterface (migrated)
│       ├── PlanCanvas (migrated)
│       └── ComplianceView (new)
│
└── CommandBar
    ├── CommandInput
    └── QuickActionButtons
```

---

## 🚀 Next Steps

**Immediate:**
1. Start with Task 1 (Dashboard Layout)
2. Build foundational structure
3. Add components incrementally

**After Phase 2:**
- Phase 3: Enhanced DXF export with layers
- Phase 4: Manual editing tools (click to draw walls)
- Phase 5: 3D view toggle

---

## 📝 Notes

- Keep existing MVP functional during migration
- Test each component integration before moving to next
- Use Zustand DevTools to debug state changes
- Maintain TypeScript strict mode

---

**Progress will be updated as tasks are completed.**

**Last Updated:** January 12, 2026 - Phase 2 Start
