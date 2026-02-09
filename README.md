# 🏗️ AI Architect - YC Ready Floor Plan Generator

An AutoCAD-inspired web application that generates building code compliant floor plans using Google Gemini AI. Built for architects who demand precision and compliance with Danish building regulations.

![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4)

## ✨ Features

- 🎨 **AutoCAD-Inspired UI** - Dark mode with precision grid, cyan accents, and professional aesthetics
- 🤖 **AI-Powered Design** - Google Gemini generates intelligent floor plans from natural language
- 📐 **Building Code Compliance** - Automatically enforces Danish building regulations (BR18/BR23)
- 🏛️ **Municipality-Specific** - Specialized for Hvidovre building requirements
- 📊 **Interactive Canvas** - Zoom, pan, and visualize floor plans in real-time
- 💬 **Chat Interface** - Natural conversation with an expert AI architect
- 🎯 **Crisp & Fast** - Micro-interactions, instant transitions, YC-grade polish

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Install dependencies
npm install

# (Optional) Set up environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using the App

1. **Landing Page** - Click "Start Building" to enter the dashboard
2. **Set API Key** - Click the key icon in the chat panel to add your Gemini API key
3. **Describe Your Project** - Tell the AI what you need (e.g., "I need a 2-bedroom apartment with an open kitchen")
4. **Review Floor Plan** - The AI generates a compliant floor plan on the canvas
5. **Export** - Download your floor plan as PDF (coming soon)

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14+** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Shadcn UI** | Premium component library |
| **Google Gemini** | AI-powered floor plan generation |
| **Lucide React** | Beautiful icons |

## 🎨 Design Philosophy

**AutoCAD Aesthetic**
- Deep zinc backgrounds (bg-zinc-950)
- Thin, precise borders (border-zinc-800)
- Cyan/teal accents for active states
- Grid overlays for technical feel
- Monospace fonts for precision

**Crispness Checklist**
- ✅ Hover states on all interactive elements
- ✅ Instant transitions (150ms)
- ✅ Shadow effects with primary color
- ✅ Smooth zoom/pan animations
- ✅ Micro-interactions everywhere

## 📂 Project Structure

```
ai-architect/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Dashboard shell
│   │   │   └── page.tsx             # Main builder app
│   │   └── api/
│   │       └── chat/route.ts        # Gemini API handler
│   └── components/
│       ├── ui/                      # Shadcn components
│       └── architect/
│           ├── ChatInterface.tsx    # AI chat panel
│           └── PlanCanvas.tsx       # Blueprint renderer
```

## 🇩🇰 Danish Building Regulations

The AI enforces these key requirements:

- **Ceiling Heights** - Minimum 2.30m in habitable rooms
- **Room Sizes** - Bedrooms ≥ 6m², Living rooms ≥ 10m²
- **Fire Safety** - Escape routes in multi-story buildings
- **Natural Light** - Windows ≥ 10% of floor area
- **Accessibility** - 77cm minimum door widths
- **Ventilation** - Mandatory in kitchens/bathrooms
- **Energy Efficiency** - Class 2020 compliance

Reference: [Hvidovre Building Regulations](https://www.hvidovre.dk/borger/by-bolig-og-byggeri/byggeri-og-byggetilladelse)

## 🔑 API Key Setup

### Option 1: In-App (Recommended)
1. Click the key icon in the chat interface
2. Paste your Gemini API key
3. Click "Save API Key"
4. Key is stored in browser localStorage

### Option 2: Environment Variable
```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
```

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🎯 Roadmap

- [x] Landing page with YC-style copy
- [x] Dashboard with resizable panels
- [x] Chat interface with Gemini
- [x] SVG floor plan rendering
- [x] Danish building code enforcement
- [ ] PDF export functionality
- [ ] Project history/save feature
- [ ] 3D view toggle
- [ ] Multi-floor support
- [ ] Furniture placement
- [ ] Cost estimation

## 📄 License

MIT License - Built with ❤️ for architects

## 🤝 Contributing

This is a YC application project. Contributions welcome after initial launch.

---

**Built with precision. Powered by AI. Compliant by design.**
