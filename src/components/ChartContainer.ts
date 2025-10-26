import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'
import { TooltipComponent } from 'echarts/components'

echarts.use([TooltipComponent])

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
    if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
      console.warn('ChartContainer: Container has zero dimensions, waiting for layout...')
      this.container.style.width = '100%'
      this.container.style.height = '100%'
      
      requestAnimationFrame(() => {
        this.init(renderer, theme)
      })
      return
    }
    
    try {
      this.chart = echarts.init(this.container, theme, {
        renderer
      })
      
      const loader = document.getElementById('chart-loader')
      if (loader) {
        loader.style.display = 'none'
      }
      
      window.addEventListener('resize', () => {
        this.chart?.resize()
      })
    } catch (error) {
      console.error('Failed to initialize ECharts:', error)
      const loader = document.getElementById('chart-loader')
      if (loader) {
        loader.style.display = 'none'
      }
      throw error
    }
  }

  setOption(option: EChartsOption) {
    if (this.chart) {
      this.chart.setOption(option)
    }
  }

  refreshData() {
    if (this.chart) {
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
