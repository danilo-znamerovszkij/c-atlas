import type { EChartsOption } from 'echarts'
import { getTheoryFullName } from '@/data/theoryNames'
import { getTaxonomyDict } from '@/utils/i18n'
import taxonomy from './taxonomy.json'

export function getDisplayLabel(englishKey: string): string {
  const { categories, subcategories, shortLabels } = getTaxonomyDict()
  return categories[englishKey] || subcategories[englishKey] || shortLabels[englishKey] || englishKey
}

const mysticPalette = {
  mainColors: [
    '#03045E', // Midnight Blue
    '#FCD771', // Golden Yellow Headings (bright, luminous)
    '#2C5A5B', // Teal-Blue (Panpsychism/Dualism segments)
    '#E8B243', // Warm Gold-Yellow (Non-physicalism/Non-vitalism)
    '#E59A14', // Rich Amber (Materialism/central accents)
    '#BE6823', // Burnt Orange (Functionalism/Materialism sub-segments)
    '#D07E1F', // Terracotta Orange (transition between warm tones)
    '#5F8366', // Olive Green (Natural Monism/Pantheism)
    '#4A4E8C', // Dusk Indigo (Phenomenology)
    '#7E885E', // Sage Green (subtle earthy balance)
    '#FCD771'  // Repeated for emphasis in highlights
  ]
}

export const colorUtils = {
  // Lighten a color by percentage
  lighten: (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  },

  desaturate: (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const R = num >> 16
    const G = num >> 8 & 0x00FF
    const B = num & 0x0000FF
    const gray = R * 0.299 + G * 0.587 + B * 0.114
    const factor = percent / 100
    const newR = Math.round(R * (1 - factor) + gray * factor)
    const newG = Math.round(G * (1 - factor) + gray * factor)
    const newB = Math.round(B * (1 - factor) + gray * factor)
    return '#' + (0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1)
  },

  reduceSaturation: (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const R = num >> 16
    const G = num >> 8 & 0x00FF
    const B = num & 0x0000FF
    const max = Math.max(R, G, B)
    const min = Math.min(R, G, B)
    const delta = max - min
    const factor = 1 - (percent / 100)
    
    if (delta === 0) return hex
    
    const newR = Math.round(max - (max - R) * factor)
    const newG = Math.round(max - (max - G) * factor)
    const newB = Math.round(max - (max - B) * factor)
    
    return '#' + (0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1)
  }
}

export const getCurrentPalette = () => mysticPalette

let showMobileLabels = false

export const setMobileLabelVisibility = (visible: boolean) => {
  showMobileLabels = visible
}

export const getMobileLabelVisibility = () => showMobileLabels

// Leaf names matching the active implications filter; null = no filter.
let highlightedTheories: Set<string> | null = null

export const setHighlightedTheories = (names: Set<string> | null) => {
  highlightedTheories = names
}

// With few enough matches, a filtered overview names each matching theory
// (labels hidden by minAngle otherwise). Desktop only, like other leaf labels.
const FILTER_LABEL_LIMIT = 100
const showFilterLabels = () =>
  highlightedTheories !== null && highlightedTheories.size < FILTER_LABEL_LIMIT && !isMobile()

export const applyPaletteToData = (data: any[]) => {
  let mainColorIndex = 0

  const applyColors = (items: any[], level: number = 0, parentColor?: string, parentName?: string) => {
    return items.map((item, index) => {
      let color: string
      let labelPosition: string | undefined
      let showLabel = true
      let fontSize: number | undefined
      
      if (level === 0) {
        color = mysticPalette.mainColors[mainColorIndex % mysticPalette.mainColors.length]
        mainColorIndex++
        labelPosition = undefined
        fontSize = undefined
      } else if (level === 1 && parentColor) {
        const lightenAmount = 20 + (index * 3) % 15
        color = colorUtils.lighten(parentColor, lightenAmount)
        
        if (parentName === 'Materialism') {
          labelPosition = undefined
          fontSize = 12
        } else {
          fontSize = 10
          if (!showMobileLabels) {
            showLabel = !isMobile();
            labelPosition = 'outside';
          } else if (showMobileLabels) {
            labelPosition = isMobile() ? undefined : 'outside'
            fontSize = isMobile() ? 13 : 16
          } else {
            labelPosition = 'outside'
          }
        }
      } else if (level >= 2 && parentColor) {
        const desatAmount = 25 + (index * 2) % 20
        color = colorUtils.desaturate(parentColor, desatAmount)
        fontSize = 10
        
        if (!showMobileLabels) {
          showLabel = !isMobile();
          labelPosition = 'outside';
        } else if (showMobileLabels) {
          labelPosition = isMobile() ? undefined : 'outside'
          fontSize = isMobile() ? 13 : 16
        } else {
          labelPosition = 'outside'
        }
      } else {
        color = '#666666'
        fontSize = undefined
      }

      const dimmed = !item.children && highlightedTheories !== null && !highlightedTheories.has(item.name)
      const named = !item.children && !dimmed && showFilterLabels()
      const newItem = {
        ...item,
        parent: parentName,
        itemStyle: dimmed ? { color, opacity: 0.12 } : { color },
        label:  showLabel && labelPosition ? { 
          position: labelPosition,
          fontSize: fontSize
        } : showLabel ? {
          fontSize: fontSize
        } : { show: false, labelPosition: 'outside' }
      }
      if (named) {
        newItem.label = { position: 'outside', fontSize: 11, minAngle: 0, color: '#fcd771' }
      } else if (dimmed) {
        newItem.label = { show: false }
      }
      
      if (item.children) {
        newItem.children = applyColors(item.children, level + 1, color, item.name)
      }
      
      return newItem
    })
  }
  
  return applyColors(data)
}

// Taxonomy mirrors the Landscape of Consciousness (loc.closertotruth.com) category tree.
// Shared with scripts/generate-sitemap.js, so it lives in JSON rather than here.
export type TaxonomyLeaf = { name: string; value: number }
export type TaxonomySub = { name: string; children: TaxonomyLeaf[] }
export type TaxonomyTop = { name: string; children: (TaxonomySub | TaxonomyLeaf)[] }
export const baseData: TaxonomyTop[] = taxonomy

export const getCurrentData = () => {
  return applyPaletteToData(baseData)
}

export const refreshChartData = () => {
  return applyPaletteToData(baseData)
}

const isMobile = () => {
  const isMobileDevice = window.innerWidth <= 768
  return isMobileDevice
}

// Ring radii (% of the chart's half-size) for root -> category -> subcategory -> leaf.
const LEVEL_RADII: [number, number][] = [[0, 10], [10, 40], [40, 60], [60, 67]]
// The overview hides leaf names (see label.minAngle), which frees the space
// their outward labels used, so draw it larger; drill-downs keep the base size
// because their leaf labels need that margin. Phones are width-bound and the
// zoom buttons sit at the right edge, so they keep the base size (pinch-zoom).
const OVERVIEW_SCALE = 1.3

export const getChartLevels = (overview: boolean) => {
  // Named filter matches need the outer margin back for their labels.
  const k = overview && !isMobile() && !showFilterLabels() ? OVERVIEW_SCALE : 1
  return LEVEL_RADII.map(([r0, r]) => ({
    r0: `${r0 * k}%`,
    r: `${r * k}%`,
    itemStyle: { borderWidth: 1 }
  }))
}

export const getChartOptions = (overview = true): EChartsOption => {
  return {
    backgroundColor: 'transparent',
    title: {
      left: 'center',
      textStyle: {
        color: '#fff'
      }
    },
    tooltip: {
      show: true,
      formatter: function (params: any) {
        if (!params.data || params.data.parent === undefined || params.data.parent === 'Materialism') {
          return ''
        }
        const fullName = getTheoryFullName(params.data.name)
        return fullName
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#FCD771',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 16
      },
      padding: [8, 12]
    },
    animation: false,
    series: [
      {
        type: 'sunburst',
        data: getCurrentData(),
        sort: undefined,
        startAngle: 83.5,
        labelLayout: showFilterLabels() ? { hideOverlap: true } : undefined,
        label: {
          rotate: 'radial',
          show: true,
          // ponytail: with ~460 leaves the overview gives each theory <1deg, so its
          // name can't fit; hide labels on slices that thin. Drill-downs (>=1.8deg
          // per leaf) keep them. Revisit if a category grows past ~300 theories.
          minAngle: 1.2,
          formatter: function (params: any) {
            if (params.data.parent === undefined) {
              return `{title|${getDisplayLabel(params.name)}}`
            }
            return getDisplayLabel(params.name)
          },
          rich: {
            title: {
              fontSize: 14
            }
          }
        },
        itemStyle: {
          borderRadius: 3,
          borderWidth: 1
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 0,
            shadowColor: 'transparent'
          },
        },
        levels: getChartLevels(overview)
      }
    ]
  }
}

export const getAllTheoryNames = (): string[] => {
  const theoryNames: string[] = []
  
  const extractTheories = (items: any[]) => {
    items.forEach(item => {
      if (!item.children) {
        theoryNames.push(item.name)
      } else {
        extractTheories(item.children)
      }
    })
  }
  
  extractTheories(baseData)
  return theoryNames
}

