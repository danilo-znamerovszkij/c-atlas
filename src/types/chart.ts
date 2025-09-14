export interface ChartDataItem {
  name: string
  value?: number
  children?: ChartDataItem[]
}

export interface ChartConfig {
  title: string
  theme: 'light' | 'dark'
  renderer: 'canvas' | 'svg'
  responsive: boolean
}

export interface ChartOptions {
  data: ChartDataItem[]
  config: Partial<ChartConfig>
}
