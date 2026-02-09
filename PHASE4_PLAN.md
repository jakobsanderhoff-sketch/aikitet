# 🚀 Phase 4: Advanced Features - Planning Document

**Goal:** Transform the MVP into a comprehensive professional platform with advanced capabilities

**Status:** 📋 Planning Phase
**Target Start:** After production testing and initial user feedback

---

## 🎯 Strategic Vision

### **Current State (Post-Phase 3):**
- ✅ Solid MVP with core functionality
- ✅ Professional UI and UX
- ✅ AI-powered generation
- ✅ AutoCAD-compatible export
- ✅ Building code compliance

### **Phase 4 Objectives:**
Transform from **"AI Floor Plan Generator"** to **"Complete Architectural Design Platform"**

**Key Pillars:**
1. **Collaboration** - Multi-user, real-time editing
2. **Persistence** - Database, authentication, project management
3. **Visualization** - 3D views, advanced rendering
4. **Automation** - Cost estimation, material selection, scheduling
5. **Integration** - API, webhooks, third-party tools

---

## 📋 Master Feature List (Prioritized)

### **🔥 Critical (Must-Have for Production)**

#### **1. User Authentication & Authorization**
**Priority:** CRITICAL ⚡
**Impact:** Enables all multi-user features
**Effort:** 3-4 days

**Features:**
- [ ] Sign up / Login (email + password)
- [ ] OAuth providers (Google, Microsoft)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Session management
- [ ] Role-based access (viewer, editor, admin)

**Tech Stack:**
- **Auth:** Clerk (recommended) or NextAuth.js
- **Why:** Pre-built UI, webhooks, user management dashboard

**Implementation:**
```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}

// Protect routes
import { auth } from '@clerk/nextjs';

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect('/sign-in');
  // ... rest of dashboard
}
```

**User Flow:**
```
1. Land on homepage → "Start Building" → Sign up modal
2. Create account (email or OAuth)
3. Verify email (automated)
4. Redirect to /dashboard
5. Create first project
```

---

#### **2. Database Integration & Project Persistence**
**Priority:** CRITICAL ⚡
**Impact:** Core data persistence
**Effort:** 4-5 days

**Features:**
- [ ] PostgreSQL database (via Supabase or Vercel Postgres)
- [ ] Prisma ORM for type-safe queries
- [ ] Project CRUD operations
- [ ] Auto-save (every 30 seconds)
- [ ] Version history (Git-like)
- [ ] Project sharing (read-only links)

**Tech Stack:**
- **Database:** PostgreSQL (Supabase recommended)
- **ORM:** Prisma
- **Storage:** S3-compatible for DXF exports

**Schema Design:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  projects  Project[]
  createdAt DateTime @default(now())
}

model Project {
  id          String   @id @default(cuid())
  name        String
  location    String?
  buildingCode String @default("BR18/BR23")
  blueprintData Json  // Store entire BlueprintData
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  sheets      Sheet[]
  versions    ProjectVersion[]
  sharedWith  ProjectShare[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Sheet {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  number    String  // "A-101"
  title     String
  type      String  // "FLOOR_PLAN"
  data      Json    // Sheet-specific data
}

model ProjectVersion {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  version     Int
  blueprintData Json
  createdBy   String
  createdAt   DateTime @default(now())
  message     String?  // Commit message
}

model ProjectShare {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  userId    String
  role      String   // "viewer" | "editor"
  createdAt DateTime @default(now())
}
```

**Auto-Save Implementation:**
```typescript
// hooks/useAutoSave.ts
export function useAutoSave() {
  const { blueprint } = useBlueprintStore();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saveInterval = setInterval(async () => {
      if (!blueprint) return;

      setIsSaving(true);
      await fetch('/api/projects/save', {
        method: 'POST',
        body: JSON.stringify(blueprint),
      });
      setIsSaving(false);
    }, 30000); // 30 seconds

    return () => clearInterval(saveInterval);
  }, [blueprint]);

  return { isSaving };
}
```

---

#### **3. Project Management Dashboard**
**Priority:** HIGH 🔥
**Impact:** User experience, retention
**Effort:** 2-3 days

**Features:**
- [ ] Projects list page (`/projects`)
- [ ] Create new project modal
- [ ] Project cards with thumbnails
- [ ] Search and filter
- [ ] Sort by date/name
- [ ] Delete project (with confirmation)
- [ ] Duplicate project
- [ ] Recent projects section
- [ ] Project templates

**UI Design:**
```
┌────────────────────────────────────────────┐
│  AI Architect                    [+ New]   │
├────────────────────────────────────────────┤
│  My Projects                      🔍 Search│
│                                            │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐│
│  │ [Image]   │ │ [Image]   │ │ [Image]   ││
│  │ Modern    │ │ Office    │ │ Apartment ││
│  │ Residence │ │ Building  │ │ Complex   ││
│  │ 3 sheets  │ │ 5 sheets  │ │ 2 sheets  ││
│  │ Updated   │ │ Updated   │ │ Updated   ││
│  │ 2h ago    │ │ yesterday │ │ last week ││
│  └───────────┘ └───────────┘ └───────────┘│
│                                            │
│  Templates                                 │
│  ┌───────────┐ ┌───────────┐              │
│  │ 2BR Apt   │ │ Small     │              │
│  │ Template  │ │ Office    │              │
│  └───────────┘ └───────────┘              │
└────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// app/projects/page.tsx
export default async function ProjectsPage() {
  const { userId } = auth();
  const projects = await db.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div>
      <ProjectsGrid projects={projects} />
    </div>
  );
}
```

---

### **💎 High Value (Differentiation Features)**

#### **4. 3D Visualization (Three.js)**
**Priority:** HIGH 🔥
**Impact:** User engagement, visual validation
**Effort:** 5-7 days

**Features:**
- [ ] 3D view toggle (button in toolbar)
- [ ] Extrude walls to ceiling height
- [ ] Render floors with textures
- [ ] Add doors and windows in 3D
- [ ] Camera controls (orbit, pan, zoom)
- [ ] Isometric view option
- [ ] First-person walkthrough
- [ ] Export 3D model (.obj, .glb)

**Tech Stack:**
- **3D Engine:** Three.js + React Three Fiber
- **Physics:** Cannon.js (for walkthrough)
- **Controls:** OrbitControls, FirstPersonControls

**Implementation Approach:**
```typescript
// components/architect/View3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function View3D({ blueprint }: { blueprint: BlueprintData }) {
  return (
    <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {/* Render walls */}
      {blueprint.sheets[0].elements.walls.map(wall => (
        <Wall3D key={wall.id} wall={wall} />
      ))}

      {/* Render floor */}
      <Floor />

      {/* Camera controls */}
      <OrbitControls />
    </Canvas>
  );
}

function Wall3D({ wall }: { wall: WallSegment }) {
  // Calculate wall geometry
  const height = 2.5; // Default ceiling height
  const geometry = calculateWall3DGeometry(wall, height);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={wall.isExternal ? '#999' : '#ccc'}
      />
    </mesh>
  );
}
```

**3D Tab in Dashboard:**
```typescript
// Update TabBar component
const tabs = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: '2d', label: '2D View', icon: Layers },
  { id: '3d', label: '3D View', icon: Box }, // NEW
  { id: 'compliance', label: 'Code Check', icon: CheckCircle },
];
```

---

#### **5. Real-Time Collaboration (WebSockets)**
**Priority:** MEDIUM-HIGH 🔥
**Impact:** Team workflows, premium feature
**Effort:** 6-8 days

**Features:**
- [ ] Multiple users editing same project
- [ ] Live cursors (see where others are)
- [ ] Real-time sync (changes appear instantly)
- [ ] User presence indicators
- [ ] Chat/comments system
- [ ] Change notifications
- [ ] Conflict resolution (last-write-wins or OT)

**Tech Stack:**
- **WebSocket:** Pusher (easiest) or Ably
- **Alternative:** Supabase Realtime
- **State Sync:** Yjs (CRDT) for conflict-free editing

**Implementation:**
```typescript
// lib/collaboration.ts
import Pusher from 'pusher-js';

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: 'eu',
});

export function useCollaboration(projectId: string) {
  const { setBlueprint } = useBlueprintStore();

  useEffect(() => {
    const channel = pusher.subscribe(`project-${projectId}`);

    // Listen for changes from other users
    channel.bind('blueprint-updated', (data: BlueprintData) => {
      setBlueprint(data);
    });

    // Broadcast local changes
    const unsubscribe = useBlueprintStore.subscribe((state) => {
      fetch('/api/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          blueprint: state.blueprint,
        }),
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      unsubscribe();
    };
  }, [projectId]);
}
```

**Presence Indicators:**
```typescript
// Show active users
<div className="flex -space-x-2">
  {activeUsers.map(user => (
    <Avatar key={user.id} className="border-2 border-white">
      <AvatarImage src={user.avatar} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  ))}
</div>
```

---

#### **6. Cost Estimation Engine**
**Priority:** MEDIUM 🎯
**Impact:** Business value, decision support
**Effort:** 4-5 days

**Features:**
- [ ] Material quantity calculation
- [ ] Labor hour estimation
- [ ] Price per square meter
- [ ] Total project cost
- [ ] Cost breakdown by category
- [ ] Regional pricing (Danish market)
- [ ] Currency support (DKK, EUR, USD)
- [ ] Export cost report (PDF)

**Data Model:**
```typescript
interface CostEstimate {
  materials: {
    brick: { quantity: number; unit: 'm²'; unitPrice: number; total: number };
    concrete: { quantity: number; unit: 'kg'; unitPrice: number; total: number };
    insulation: { quantity: number; unit: 'm²'; unitPrice: number; total: number };
    doors: { quantity: number; unit: 'pcs'; unitPrice: number; total: number };
    windows: { quantity: number; unit: 'm²'; unitPrice: number; total: number };
  };
  labor: {
    masonry: { hours: number; hourlyRate: number; total: number };
    carpentry: { hours: number; hourlyRate: number; total: number };
    electrical: { hours: number; hourlyRate: number; total: number };
    plumbing: { hours: number; hourlyRate: number; total: number };
  };
  subtotal: number;
  vat: number; // 25% in Denmark
  total: number;
}
```

**Calculation Logic:**
```typescript
export function calculateCost(blueprint: BlueprintData): CostEstimate {
  const sheet = blueprint.sheets[0];

  // Calculate wall areas by material
  const wallAreas = sheet.elements.walls.reduce((acc, wall) => {
    const area = getWallLength(wall) * 2.5; // height
    acc[wall.material] = (acc[wall.material] || 0) + area;
    return acc;
  }, {} as Record<string, number>);

  // Apply pricing
  const materialCosts = {
    brick: wallAreas.brick * PRICES.brick,
    concrete: wallAreas.concrete * PRICES.concrete,
    // ... etc
  };

  // Estimate labor hours
  const laborHours = {
    masonry: (wallAreas.brick + wallAreas.concrete) * 0.5, // 0.5h per m²
    // ... etc
  };

  return {
    materials: materialCosts,
    labor: laborHours,
    subtotal: /* sum */,
    vat: /* subtotal * 0.25 */,
    total: /* subtotal + vat */,
  };
}
```

**UI Component:**
```typescript
// components/CostEstimatePanel.tsx
export function CostEstimatePanel() {
  const { blueprint } = useBlueprintStore();
  const estimate = calculateCost(blueprint);

  return (
    <Card>
      <h3>Cost Estimate</h3>

      {/* Materials */}
      <h4>Materials</h4>
      {Object.entries(estimate.materials).map(([material, data]) => (
        <div key={material}>
          <span>{material}</span>
          <span>{data.quantity} {data.unit}</span>
          <span>{data.total} DKK</span>
        </div>
      ))}

      {/* Labor */}
      <h4>Labor</h4>
      {Object.entries(estimate.labor).map(([trade, data]) => (
        <div key={trade}>
          <span>{trade}</span>
          <span>{data.hours} hours</span>
          <span>{data.total} DKK</span>
        </div>
      ))}

      {/* Total */}
      <div className="text-2xl font-bold">
        Total: {estimate.total.toLocaleString()} DKK
      </div>
    </Card>
  );
}
```

---

### **🎨 Polish & Enhancement**

#### **7. Advanced Manual Editing Tools**
**Priority:** MEDIUM 🎯
**Impact:** Professional workflows
**Effort:** 5-6 days

**Features:**
- [ ] Click to draw walls (like AutoCAD)
- [ ] Drag wall endpoints to resize
- [ ] Snap to grid (5cm, 10cm, 25cm)
- [ ] Dimension tools (linear, angular, radial)
- [ ] Copy/paste elements
- [ ] Mirror/rotate elements
- [ ] Array (repeat elements in pattern)
- [ ] Trim/extend walls
- [ ] Offset parallel walls

**Implementation:**
```typescript
// Drawing mode state
const [drawMode, setDrawMode] = useState<'select' | 'wall' | 'door' | 'window'>('select');

// Canvas click handler
function handleCanvasClick(e: MouseEvent) {
  const point = screenToWorld(e.clientX, e.clientY);

  if (drawMode === 'wall') {
    if (!wallStart) {
      setWallStart(point);
    } else {
      // Create wall from wallStart to point
      addWall({
        id: generateId(),
        start: wallStart,
        end: point,
        thickness: 0.35,
        material: 'concrete',
        type: 'INTERIOR_PARTITION',
        layer: 'A-WALL',
        isExternal: false,
      });
      setWallStart(null);
    }
  }
}
```

**Toolbar:**
```tsx
<Toolbar>
  <ToolButton icon={<MousePointer />} active={drawMode === 'select'} onClick={() => setDrawMode('select')} />
  <ToolButton icon={<Minus />} active={drawMode === 'wall'} onClick={() => setDrawMode('wall')} />
  <ToolButton icon={<Square />} active={drawMode === 'door'} onClick={() => setDrawMode('door')} />
  <ToolButton icon={<Frame />} active={drawMode === 'window'} onClick={() => setDrawMode('window')} />
</Toolbar>
```

---

#### **8. Furniture & Fixtures Library**
**Priority:** LOW-MEDIUM 🎯
**Impact:** Visualization completeness
**Effort:** 3-4 days

**Features:**
- [ ] Furniture library (beds, sofas, tables, chairs)
- [ ] Kitchen appliances (stove, fridge, sink)
- [ ] Bathroom fixtures (toilet, shower, bathtub)
- [ ] Drag-and-drop placement
- [ ] Rotation and scaling
- [ ] A-FURN layer in DXF export
- [ ] Custom furniture upload

**Library Structure:**
```typescript
const FURNITURE_LIBRARY = {
  bedroom: [
    { id: 'single-bed', name: 'Single Bed', width: 0.9, depth: 2.0, icon: '🛏️' },
    { id: 'double-bed', name: 'Double Bed', width: 1.4, depth: 2.0, icon: '🛏️' },
    { id: 'wardrobe', name: 'Wardrobe', width: 0.6, depth: 2.0, icon: '🚪' },
  ],
  living: [
    { id: 'sofa-2', name: '2-Seater Sofa', width: 1.5, depth: 0.8, icon: '🛋️' },
    { id: 'sofa-3', name: '3-Seater Sofa', width: 2.0, depth: 0.8, icon: '🛋️' },
    { id: 'coffee-table', name: 'Coffee Table', width: 1.0, depth: 0.5, icon: '⬜' },
  ],
  kitchen: [
    { id: 'stove', name: 'Stove', width: 0.6, depth: 0.6, icon: '🔥' },
    { id: 'fridge', name: 'Refrigerator', width: 0.7, depth: 0.7, icon: '❄️' },
    { id: 'sink', name: 'Kitchen Sink', width: 0.5, depth: 0.5, icon: '🚰' },
  ],
};
```

---

#### **9. Keyboard Shortcuts & Command Palette**
**Priority:** LOW 🎯
**Impact:** Power user efficiency
**Effort:** 2-3 days

**Features:**
- [ ] Cmd+K command palette (like VS Code)
- [ ] Undo: Cmd+Z
- [ ] Redo: Cmd+Shift+Z
- [ ] Save: Cmd+S
- [ ] Export: Cmd+E
- [ ] New sheet: Cmd+N
- [ ] Delete: Delete/Backspace
- [ ] Select all: Cmd+A
- [ ] Copy: Cmd+C
- [ ] Paste: Cmd+V
- [ ] Zoom in: Cmd++ or scroll
- [ ] Zoom out: Cmd+- or scroll
- [ ] Fit to screen: Cmd+0

**Implementation:**
```typescript
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  const { undo, redo, blueprint, saveProject } = useBlueprintStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }

      // Cmd+Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Cmd+Shift+Z: Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Cmd+S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveProject(blueprint);
      }

      // ... more shortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, blueprint, saveProject]);

  return { commandPaletteOpen, setCommandPaletteOpen };
}
```

**Command Palette UI:**
```tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Type a command..." />
  <CommandList>
    <CommandGroup heading="Project">
      <CommandItem onSelect={() => newProject()}>
        <Plus className="mr-2" /> New Project
      </CommandItem>
      <CommandItem onSelect={() => saveProject()}>
        <Save className="mr-2" /> Save Project
      </CommandItem>
    </CommandGroup>

    <CommandGroup heading="Export">
      <CommandItem onSelect={() => exportDXF()}>
        <FileDown className="mr-2" /> Export DXF
      </CommandItem>
      <CommandItem onSelect={() => exportPDF()}>
        <FileText className="mr-2" /> Export PDF
      </CommandItem>
    </CommandGroup>

    <CommandGroup heading="View">
      <CommandItem onSelect={() => switchTab('2d')}>
        <Layers className="mr-2" /> 2D View
      </CommandItem>
      <CommandItem onSelect={() => switchTab('3d')}>
        <Box className="mr-2" /> 3D View
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

#### **10. PDF Export with Annotations**
**Priority:** LOW-MEDIUM 🎯
**Impact:** Professional deliverables
**Effort:** 3-4 days

**Features:**
- [ ] Export to PDF (A3 format)
- [ ] Multiple sheets in one PDF
- [ ] Preserve layers (optional layers)
- [ ] Annotations (stamps, notes)
- [ ] Page numbers
- [ ] Table of contents
- [ ] Digital signature support
- [ ] Watermark option

**Tech Stack:**
- **Library:** jsPDF + SVG to PDF
- **Alternative:** Puppeteer (server-side)

**Implementation:**
```typescript
import { jsPDF } from 'jspdf';

export function exportToPDF(blueprint: BlueprintData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  });

  blueprint.sheets.forEach((sheet, index) => {
    if (index > 0) doc.addPage();

    // Add title
    doc.setFontSize(20);
    doc.text(sheet.title, 20, 20);

    // Convert SVG to PDF
    const svg = renderSheetToSVG(sheet);
    doc.svg(svg, {
      x: 10,
      y: 30,
      width: 400,
      height: 267,
    });

    // Add footer
    doc.setFontSize(10);
    doc.text(`Page ${index + 1} of ${blueprint.sheets.length}`, 200, 290);
  });

  doc.save(`${blueprint.projectName}.pdf`);
}
```

---

### **🔌 Integration & API**

#### **11. Public API for Third-Party Integration**
**Priority:** LOW 🎯
**Impact:** Ecosystem, partnerships
**Effort:** 4-5 days

**Features:**
- [ ] REST API endpoints
- [ ] API key authentication
- [ ] Rate limiting
- [ ] Webhooks (project created, updated)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] SDKs (TypeScript, Python)

**Endpoints:**
```
POST   /api/v1/projects           Create project
GET    /api/v1/projects/:id       Get project
PUT    /api/v1/projects/:id       Update project
DELETE /api/v1/projects/:id       Delete project
GET    /api/v1/projects/:id/dxf   Export DXF
GET    /api/v1/projects/:id/pdf   Export PDF
POST   /api/v1/ai/generate        Generate floor plan
POST   /api/v1/compliance/check   Check compliance
```

**Authentication:**
```typescript
// middleware/api-auth.ts
export async function validateAPIKey(req: Request) {
  const apiKey = req.headers.get('X-API-Key');
  if (!apiKey) throw new Error('API key required');

  const key = await db.apiKey.findUnique({
    where: { key: apiKey },
    include: { user: true },
  });

  if (!key || !key.active) throw new Error('Invalid API key');

  return key.user;
}
```

---

## 📊 Phase 4 Implementation Roadmap

### **Sprint 1: Foundation (2 weeks)**
Week 1:
- [ ] User authentication (Clerk setup)
- [ ] Database schema (Prisma)
- [ ] Database migrations

Week 2:
- [ ] Project CRUD API
- [ ] Auto-save implementation
- [ ] Projects dashboard

### **Sprint 2: Core Features (3 weeks)**
Week 3-4:
- [ ] 3D visualization (Three.js)
- [ ] 3D tab integration
- [ ] Camera controls

Week 5:
- [ ] Cost estimation engine
- [ ] Cost breakdown UI
- [ ] Export cost report

### **Sprint 3: Collaboration (2 weeks)**
Week 6-7:
- [ ] Real-time sync (Pusher)
- [ ] Presence indicators
- [ ] Comments system

### **Sprint 4: Polish (2 weeks)**
Week 8:
- [ ] Keyboard shortcuts
- [ ] Command palette
- [ ] Advanced editing tools

Week 9:
- [ ] PDF export
- [ ] Furniture library
- [ ] Testing & bug fixes

### **Sprint 5: API & Integration (1 week)**
Week 10:
- [ ] Public API endpoints
- [ ] API documentation
- [ ] Rate limiting

---

## 💰 Monetization Strategy

### **Pricing Tiers:**

**Free Tier:**
- 3 projects
- Single user
- Basic export (DXF only)
- Community support

**Pro Tier ($29/month):**
- Unlimited projects
- Multi-sheet support
- 3D visualization
- PDF + DXF export
- Cost estimation
- Priority support

**Team Tier ($99/month):**
- Everything in Pro
- 5 team members
- Real-time collaboration
- Version history (unlimited)
- API access (1000 calls/month)
- Custom branding

**Enterprise (Custom):**
- Unlimited team members
- Dedicated support
- On-premise deployment
- Custom integrations
- SLA guarantees
- Training sessions

---

## 📈 Success Metrics

### **Phase 4 KPIs:**
- **User Retention:** 60% monthly retention
- **Project Creation:** 10+ projects per active user
- **Collaboration:** 30% of projects shared
- **Export Rate:** 80% of projects exported
- **API Usage:** 5000+ API calls/month
- **Revenue:** $10k MRR within 3 months

---

## 🛠️ Technical Debt & Maintenance

### **Refactoring Needs:**
- [ ] Complete PlanCanvas Zustand migration (remaining 10%)
- [ ] Add element click selection
- [ ] Optimize SVG rendering for large floor plans
- [ ] Add test coverage (Jest + React Testing Library)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add error monitoring (Sentry)
- [ ] Performance monitoring (Vercel Analytics)

---

## 🎓 Learning Resources

### **For 3D Visualization:**
- Three.js Documentation: https://threejs.org/docs/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- Three.js Journey Course: https://threejs-journey.com/

### **For Real-Time Collaboration:**
- Pusher Tutorial: https://pusher.com/tutorials
- Yjs (CRDT): https://docs.yjs.dev/
- Building Collaborative Apps: https://liveblocks.io/docs

### **For Authentication:**
- Clerk Documentation: https://clerk.com/docs
- NextAuth.js Guide: https://next-auth.js.org/

---

## 📝 Notes

**Dependencies to Add:**
```json
{
  "@clerk/nextjs": "^4.29.0",
  "@prisma/client": "^5.8.0",
  "prisma": "^5.8.0",
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.92.0",
  "three": "^0.160.0",
  "pusher-js": "^8.4.0-rc2",
  "jspdf": "^2.5.1",
  "cmdk": "^0.2.0"
}
```

**Environment Variables:**
```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# Real-time
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
PUSHER_APP_ID=

# API
API_SECRET_KEY=
```

---

## 🎯 Phase 4 Summary

**Total Features:** 11 major features
**Estimated Time:** 10 weeks (2.5 months)
**Complexity:** HIGH
**Impact:** TRANSFORMATIVE

**Priority Order:**
1. Authentication + Database (CRITICAL)
2. Projects Dashboard (CRITICAL)
3. 3D Visualization (HIGH VALUE)
4. Cost Estimation (HIGH VALUE)
5. Real-Time Collaboration (HIGH VALUE)
6. Manual Editing Tools (MEDIUM)
7. Keyboard Shortcuts (MEDIUM)
8. PDF Export (MEDIUM)
9. Furniture Library (LOW-MEDIUM)
10. Public API (LOW)

---

**Phase 4 will transform AI Architect from an MVP into a comprehensive professional platform ready for scale! 🚀**
