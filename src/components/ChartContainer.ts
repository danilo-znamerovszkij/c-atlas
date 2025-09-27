import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'

export class ChartContainer {
  private chart: echarts.ECharts | null = null
  private container: HTMLElement

  constructor(containerId: string) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Container with id '${containerId}' not found`)
    }
    this.container = element
  }

  init(renderer: 'canvas' | 'svg' = 'svg', theme: string = 'dark') {
    this.chart = echarts.init(this.container, theme, {
      renderer
    })
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.chart?.resize()
    })
  }

  setOption(option: EChartsOption) {
    if (this.chart) {
      this.chart.setOption(option)
    }
  }

  refreshData() {
    if (this.chart) {
      // Force a re-render by setting the option again
      this.chart.setOption(this.chart.getOption(), true)
    }
  }

  getChart(): echarts.ECharts | null {
    return this.chart
  }

  resize() {
    this.chart?.resize()
  }

  destroy() {
    this.chart?.dispose()
    this.chart = null
  }
}
