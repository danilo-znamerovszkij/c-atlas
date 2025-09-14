export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE || 'C-Atlas',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  chart: {
    theme: import.meta.env.VITE_CHART_THEME || 'dark',
    renderer: import.meta.env.VITE_CHART_RENDERER || 'svg'
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  }
} as const
