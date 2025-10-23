# Consciousness Atlas

An interactive web application that visualizes Robert Lawrence Kuhn's "Landscape of Consciousness" - mapping over 325 theories of phenomenal consciousness in an explorable sunburst chart.

## Tech Stack & Architecture

- **Frontend**: TypeScript + Vite with ESBuild
- **Charts**: ECharts 6.0 with Sunburst visualization (SVG/Canvas renderers)
- **Styling**: SCSS with responsive design and mobile optimization
- **Deployment**: Vercel with SPA routing and file-based routing
- **Form Submissions**: Telegram Bot API integration for feedback collection
- **Dependencies**: Minimal - only ECharts, Vite, TypeScript, and SCSS

## Technical Features

- 🚀 **Minimal Bundle Size** - Tree-shaking and code splitting (only SunburstChart, SVGRenderer, CanvasRenderer, TitleComponent)
- 📱 **Responsive Design** - Dynamic label positioning and mobile-optimized interactions
- 🎨 **Dynamic Color System** - Mystic-themed palette with automatic hierarchy-based color variations
- 🔄 **SPA Routing** - Client-side routing with history API fallback
- 📊 **High Performance** - SVG renderer for crisp scaling, Canvas fallback
- 🤖 **Telegram Integration** - Form submissions sent directly to Telegram bot

## Form Submissions & Telegram Integration

The feedback form uses a serverless API endpoint (`api/submit.ts`) that forwards submissions to a Telegram bot:

- **API Endpoint**: `/api/submit` - Handles POST requests with form data
- **Telegram Bot**: Sends formatted messages to a designated Telegram chat
- **Error Handling**: Graceful fallback with user feedback
- **Security**: Basic validation and sanitization of form inputs

## Analytics & Mixpanel Integration

The application includes comprehensive analytics tracking using Mixpanel:

### Setup
1. Create a Mixpanel project and get your project token
2. Set the environment variable: `VITE_MIXPANEL_TOKEN=your_token_here`
3. Analytics will automatically initialize in production mode

### Tracked Events

1. **Page Views** - Each theory navigation is tracked as a page view
   - Event: `Page View`
   - Properties: `theory_name`, `category`, `subcategory`, `page_type`

2. **Click Tracking** - Various user interactions
   - Event: `Click`
   - Elements tracked:
     - Feedback button clicks
     - GitHub link clicks
     - Kuhn paper link clicks
     - Twitter/X link clicks
     - "Read more" link clicks
   - Properties: `element`, `position`, `link_url`, `click_type`

3. **Form Submissions** - Feedback form interactions
   - Event: `Form Submission`
   - Properties: `form_type`, `success`, `error_message`, `submission_type`

### Analytics Configuration
- **Debug Mode**: Enabled in development, disabled in production
- **Persistence**: Uses localStorage for session persistence
- **Tracking**: Only tracks in production when token is provided
- **Properties**: Includes timestamp, URL, user agent, and additional custom properties

## Project Structure

```
src/
├── components/          # UI components
│   ├── TheoryChart.ts   # Main sunburst chart component
│   ├── SearchBar.ts     # Theory search functionality
│   ├── FormPopup.ts     # Feedback form modal
│   └── ItemDetailsPanel.ts # Theory detail viewer
├── config/             # Configuration files
│   ├── appConfig.ts     # App settings and environment variables
│   └── chartConfig.ts   # Chart data, colors, and ECharts options
├── data/               # Data files
│   ├── theoryNames.ts   # Theory name mappings
│   └── THEORY.md       # Theory documentation
├── pages/              # Page-specific styles
│   └── theory.scss     # Theory detail page styling
├── styles/             # Global styles
│   ├── main.scss       # Main stylesheet
│   └── _mixins.scss    # SCSS mixins
├── types/              # TypeScript definitions
│   ├── theory.ts       # Mind Theory Taxon Schema (MTTS) interface
│   └── chart.ts        # Chart-related types
├── utils/              # Utility functions
│   ├── routing.ts      # Client-side routing
│   ├── globalState.ts  # Application state management
│   ├── chartUtils.ts   # Chart helper functions
│   ├── slugUtils.ts    # URL slug utilities
│   └── apiMock.ts      # Mock API for development
└── main.ts             # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 22.x
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

## Development

The project uses:
- **Path mapping** for clean imports (`@/components/*`, `@/config/*`, `@/types/*`)
- **Tree-shaking** - Only imports required ECharts components (SunburstChart, SVGRenderer, CanvasRenderer)
- **Code splitting** - ECharts is automatically chunked for better performance
- **SCSS** - Modular styling with mixins and responsive design
- **TypeScript** - Strict typing

## Chart Configuration

The sunburst chart is configured in `src/config/chartConfig.ts`:

- **Data Structure**: Hierarchical theory organization (10 main categories → subcategories → individual theories)
- **Color Palette**: Mystic-themed colors with automatic lightening/desaturation for hierarchy levels
- **Label Positioning**: Dynamic positioning based on device type and hierarchy level
- **Interactive Features**: Tooltips, click handlers, and responsive behavior

## Deployment

The project is configured for Vercel deployment:

```bash
# Build for production
npm run build

# Deploy to Vercel (if using Vercel CLI)
vercel --prod
```

The `vercel.json` configuration includes:
- SPA routing with history API fallback
- Asset caching headers
- Build command configuration

## Performance Features

- **Tree-shaking**: Only loads required ECharts components (SunburstChart, SVGRenderer, CanvasRenderer, TitleComponent)
- **Code splitting**: ECharts automatically chunked for better loading performance
- **Responsive rendering**: SVG renderer for crisp scaling, Canvas fallback
- **Optimized builds**: ESBuild for fast development and production builds
- **Mobile optimization**: Dynamic label visibility and positioning

## Customization

To modify the chart:

1. **Data**: Edit `baseData` in `src/config/chartConfig.ts`
2. **Colors**: Modify `mysticPalette` and color utility functions
3. **Styling**: Update SCSS files in `src/styles/` and `src/pages/`
4. **Chart Options**: Modify `getChartOptions()` function
5. **Theory Data**: Add entries to data files in `src/data/`

---

## About the Consciousness Atlas

The Consciousness Atlas is a free web app that transforms Kuhn's 2024 academic paper into an interactive visualization. It presents theories of consciousness organized along a spectrum from most physical (Materialism) to least physical (Idealism), allowing users to explore the field visually and access detailed theory entries.

## Features

- 🧠 **Interactive Sunburst Chart** - Visualize 325+ consciousness theories in a hierarchical layout
- 📚 **Detailed Theory Entries** - Click any theory to read structured summaries with sources
- 🔍 **Search Functionality** - Find specific theories quickly
- 📱 **Responsive Design** - Optimized for desktop and mobile viewing

## Theory Data

Theories are organized using Kuhn's taxonomy with structured data following the Mind Theory Taxon Schema (MTTS):

- **IdAndClass**: Theory title, summary, thinkers, category classification
- **ConceptualGround**: Ontological status, mind-body relationship, qualia accounts
- **MechanismAndDynamics**: Scope, mechanisms, evidence, evolutionary accounts
- **EmpiricsAndCritiques**: Testability, criticisms, limitations
- **Implications**: Stances on AI consciousness, survival after death, meaning
- **RelationsAndSources**: Related theories and academic references

## Academic Context

Based on Robert Lawrence Kuhn's 2024 paper "A Landscape of Consciousness" published in Progress in Biophysics and Molecular Biology. The Atlas follows Kuhn's "collect and categorize, not assess and adjudicate" approach, providing a neutral visualization of the consciousness research landscape.

## License

MIT
