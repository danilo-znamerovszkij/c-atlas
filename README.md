# Consciousness Atlas

Interactive chart visualization project built with Vite, TypeScript, and ECharts.

## Features

- ⚡ **Super fast development** with Vite
- 🎯 **TypeScript** for strong typing and better DX
- 📊 **ECharts integration** with tree-shaking for optimal bundle size
- 🎨 **Canvas renderer** for crisp, scalable charts
- 🔧 **Clean imports** with vite-tsconfig-paths
- 📱 **Responsive design** with automatic resize handling

## Tech Stack

- **Bundler**: Vite (super fast dev + optimized build)
- **Language**: TypeScript (strong typing for ECharts config + DX)
- **Charts**: ECharts with tree-shaking (only import what you need)
- **Renderer**: SVG (scales well for screenshots/exports)
- **Build**: ESBuild for fast builds

## Project Structure

```
src/
├── components/          # Reusable UI components
├── config/             # Chart configurations
│   └── chartConfig.ts  # ECharts options and data
├── types/              # TypeScript type definitions
├── main.ts             # Main application entry point
└── style.css           # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The project uses:
- **Path mapping** for clean imports (`@/components/*`, `@/config/*`)
- **Tree-shaking** - only import the ECharts modules you need
- **Code splitting** - ECharts is automatically chunked for better performance

## Chart Configuration

Chart options are kept in a separate config file (`src/config/chartConfig.ts`) for maintainability. You can easily:

- Modify chart data
- Change chart types
- Update styling and themes
- Add new chart configurations

## Deployment

This project can be easily deployed on:
- **Vercel** - `npm run build` then deploy the `dist` folder
- **Netlify** - Connect your repo and it will auto-deploy
- **GitHub Pages** - `npm run build` then push the `dist` folder to gh-pages branch

## Performance Features

- **Tree-shaking**: Only loads required ECharts components
- **SVG renderer**: Better for static/interactive charts
- **Code splitting**: Automatic chunking of heavy dependencies
- **Optimized builds**: ESBuild for fast production builds

## Customization

To add new chart types:
1. Import the required ECharts components in `main.ts`
2. Add the component to `echarts.use()`
3. Create new chart options in `chartConfig.ts`
4. Update the chart type in the series configuration

## License

MIT
