import type { EChartsOption } from 'echarts'

// Color palette - Mystic Depths & Illumination
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
    '#7E885E', // Sage Green (subtle earthy balance)
    '#FCD771'  // Repeated for emphasis in highlights
  ]
}

// Color utility functions
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

  // Desaturate a color by percentage
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

  // Adjust saturation down by percentage
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

// Function to get current palette colors
export const getCurrentPalette = () => mysticPalette

// Function to apply colors to data
export const applyPaletteToData = (data: any[]) => {
  let mainColorIndex = 0
  
  const applyColors = (items: any[], level: number = 0, parentColor?: string, parentName?: string) => {
    return items.map((item, index) => {
      let color: string
      let labelPosition: string | undefined
      let showLabel = true
      
      console.log(`Processing item: ${item.name} at level ${level}`)
      
      if (level === 0) {
        // Top level - assign unique color from palette
        color = mysticPalette.mainColors[mainColorIndex % mysticPalette.mainColors.length]
        mainColorIndex++
        // Top level labels stay inside
        labelPosition = undefined
      } else if (level === 1 && parentColor) {
        // Second level - lighten by 20-30% with variation based on index
        const lightenAmount = 20 + (index * 3) % 15 // 20-35% variation
        color = colorUtils.lighten(parentColor, lightenAmount)
        
        // For Materialism category, subcategories stay inside
        // For other categories, subcategories go outside
        if (parentName === 'Materialism') {
          labelPosition = undefined // Stay inside
        } else {
          labelPosition = 'outside' // Go outside
        }
      } else if (level >= 2 && parentColor) {
        // Third level and beyond - desaturate with variation based on index
        const desatAmount = 25 + (index * 2) % 20 // 25-45% variation
        color = colorUtils.desaturate(parentColor, desatAmount)
        
        // Third level and beyond always go outside
        labelPosition = 'outside'
        
        // On mobile, hide labels for level 3+ (smallest items - outermost ring)
        if (isMobile() && level >= 3) {
          showLabel = false
          console.log(`Mobile detected: hiding label for level ${level} item: ${item.name}`)
        }
      } else {
        color = '#666666' // Fallback color
      }
      
      const newItem = {
        ...item,
        parent: parentName, // Add parent name to each item
        itemStyle: { color },
        label: showLabel && labelPosition ? { 
          position: labelPosition,
          fontSize: level >= 2 || (level === 1 && parentName !== 'Materialism') ? 10 : 12
        } : showLabel ? {
          fontSize: level >= 2 || (level === 1 && parentName !== 'Materialism') ? 10 : 12
        } : undefined
      }
      
      if (item.children) {
        newItem.children = applyColors(item.children, level + 1, color, item.name)
      }
      
      return newItem
    })
  }
  
  return applyColors(data)
}

// Base data structure without colors
export const baseData = [
  {
    name: 'Materialism',
    children: [
      {
        name: 'Philosophical',
        children: [
          { name: 'Eliminative', value: 1 },
          { name: 'Epiphenomenalism', value: 1 },
          { name: 'Functionalism', value: 1 },
          { name: 'Emergence', value: 1 },
          { name: 'Mind-Brain', value: 1 },
          { name: 'Searle', value: 1 },
          { name: 'Block', value: 1 },
          { name: 'Flanagan', value: 1 },
          { name: 'Papineau', value: 1 },
          { name: 'Goldstein', value: 1 },
          { name: 'Hardcastle', value: 1 },
          { name: 'Stoljar', value: 1 }
        ]
      },
      {
        name: 'Neurobiological',
        children: [
          { name: 'Edelman', value: 1 },
          { name: 'Crick-Koch', value: 1 },
          { name: 'Baars-Dehaene', value: 1 },
          { name: 'Dennett', value: 1 },
          { name: 'Minsky', value: 1 },
          { name: 'Graziano', value: 1 },
          { name: 'Prinz', value: 1 },
          { name: 'Sapolsky', value: 1 },
          { name: 'Mitchell', value: 1 },
          { name: 'Bach', value: 1 },
          { name: 'Brain Circuits', value: 1 },
          { name: 'Northoff', value: 1 },
          { name: 'Bunge', value: 1 },
          { name: 'Hirstein', value: 1 }
        ]
      },
      {
        name: 'Electromagnetic',
        children: [
          { name: 'Jones', value: 1 },
          { name: 'Pockett', value: 1 },
          { name: 'McFadden', value: 1 },
          { name: 'Ephaptic', value: 1 },
          { name: 'Ambron', value: 1 },
          { name: 'Llinas', value: 1 },
          { name: 'Zhang', value: 1 }
        ]
      },
      {
        name: 'Computational',
        children: [
          { name: 'Computational', value: 1 },
          { name: 'Grossberg', value: 1 },
          { name: 'Adaptive Systems', value: 1 },
          { name: 'Critical Brain', value: 1 },
          { name: 'Pribram', value: 1 },
          { name: 'Doyle', value: 1 },
          { name: 'Informational', value: 1 },
          { name: 'Mathematical', value: 1 }
        ]
      },
      {
        name: 'Homeostatic',
        children: [
          { name: 'Predictive', value: 1 },
          { name: 'Seth', value: 1 },
          { name: 'Damasio', value: 1 },
          { name: 'Friston', value: 1 },
          { name: 'Solms', value: 1 },
          { name: 'Carhart-Harris', value: 1 },
          { name: 'Buzsáki', value: 1 },
          { name: 'Deacon', value: 1 },
          { name: 'Pereira', value: 1 },
          { name: 'Mansell', value: 1 },
          { name: 'Projective', value: 1 },
          { name: 'Pepperell', value: 1 }
        ]
      },
      {
        name: 'Embodied',
        children: [
          { name: 'Embodied', value: 1 },
          { name: 'Enactivism', value: 1 },
          { name: 'Varela', value: 1 },
          { name: 'Thompson', value: 1 },
          { name: 'Frank-Gleiser', value: 1 },
          { name: 'Bitbol', value: 1 },
          { name: 'Direct Perception', value: 1 },
          { name: 'Gibson', value: 1 }
        ]
      },
      {
        name: 'Relational',
        children: [
          { name: 'A. Clark', value: 1 },
          { name: 'Noë', value: 1 },
          { name: 'Loorits', value: 1 },
          { name: 'Lahav', value: 1 },
          { name: 'Tsuchiya', value: 1 },
          { name: 'Jaworski', value: 1 },
          { name: 'Process', value: 1 }
        ]
      },
      {
        name: 'Representational',
        children: [
          { name: 'First-Order', value: 1 },
          { name: 'Lamme', value: 1 },
          { name: 'Higher-Order', value: 1 },
          { name: 'Lau', value: 1 },
          { name: 'LeDoux', value: 1 },
          { name: 'Humphrey', value: 1 },
          { name: 'Metzinger', value: 1 },
          { name: 'Jackson', value: 1 },
          { name: 'Lycan', value: 1 },
          { name: 'Transparency', value: 1 },
          { name: 'Tye', value: 1 },
          { name: 'Thagard', value: 1 },
          { name: 'T. Clark', value: 1 },
          { name: 'Deacon', value: 1 }
        ]
      },
      {
        name: 'Language',
        children: [
          { name: 'Chomsky', value: 1 },
          { name: 'Searle', value: 1 },
          { name: 'Koch', value: 1 },
          { name: 'Smith', value: 1 },
          { name: 'Jaynes', value: 1 },
          { name: 'Parrington', value: 1 }
        ]
      },
      {
        name: 'Phylogenetic',
        children: [
          { name: 'Dennett', value: 1 },
          { name: 'LeDoux', value: 1 },
          { name: 'Ginsburg-Jablonka', value: 1 },
          { name: 'Cleeremans', value: 1 },
          { name: 'Andrews', value: 1 },
          { name: 'Reber', value: 1 },
          { name: 'Feinberg-Mallatt', value: 1 },
          { name: 'Levin', value: 1 },
          { name: 'James', value: 1 }
        ]
      }
    ]
  },
  {
    name: 'Non-Reductive',
    children: [
      { name: 'Ellis', value: 1 },
      { name: 'Murphy', value: 1 },
      { name: 'van Inwagen', value: 1 },
      { name: 'Nagasawa', value: 1 },
      { name: 'Sanfey', value: 1 },
      { name: 'Northoff', value: 1 }
    ]
  },
  {
    name: 'Quantum',
    children: [
      { name: 'Penrose-Hameroff', value: 1 },
      { name: 'Stapp', value: 1 },
      { name: 'Bohm', value: 1 },
      { name: 'Pylkkänen', value: 1 },
      { name: 'Wolfram', value: 1 },
      { name: 'Beck-Eccles', value: 1 },
      { name: 'Kauffman', value: 1 },
      { name: 'Torday', value: 1 },
      { name: 'Smolin', value: 1 },
      { name: 'Carr', value: 1 },
      { name: 'Faggin', value: 1 },
      { name: 'Fisher', value: 1 },
      { name: 'Globus', value: 1 },
      { name: 'Poznanski', value: 1 },
      { name: 'Quantum Extensions', value: 1 },
      { name: 'Rovelli', value: 1 }
    ]
  },
  {
    name: 'Integrated Info',
    children: [
      { name: 'Critiques', value: 1 },
      { name: 'Koch', value: 1 }
    ],
  },
  {
    name: 'Panpsychism',
    children: [
      { name: 'Micropsychism', value: 1 },
      { name: 'Panprotopsychism', value: 1 },
      { name: 'Cosmopsychism', value: 1 },
      { name: 'Qualia Force', value: 1 },
      { name: 'Qualia Space', value: 1 },
      { name: 'Chalmers', value: 1 },
      { name: 'Strawson', value: 1 },
      { name: 'Goff', value: 1 },
      { name: 'A. Harris', value: 1 },
      { name: 'Sheldrake', value: 1 },
      { name: 'Wallace', value: 1 },
      { name: 'Whitehead', value: 1 }
    ]
  },
  {
    name: 'Monism',
    children: [
      { name: 'Russellian', value: 1 },
      { name: 'Davidson', value: 1 },
      { name: 'Velmans', value: 1 },
      { name: 'Strawson', value: 1 },
      { name: 'Polkinghorne', value: 1 },
      { name: 'Teilhard', value: 1 },
      { name: 'Atmanspacher', value: 1 },
      { name: 'Ramachandran', value: 1 },
      { name: 'Tegmark', value: 1 },
      { name: 'QRI', value: 1 },
      { name: 'Bentley Hart', value: 1 },
      { name: 'Leslie', value: 1 }
    ]
  },
  {
    name: 'Dualism',
    children: [
      { name: 'Property', value: 1 },
      { name: 'Traditional', value: 1 },
      { name: 'Swinburne', value: 1 },
      { name: 'Composite', value: 1 },
      { name: 'Stump', value: 1 },
      { name: 'Feser', value: 1 },
      { name: 'Moreland', value: 1 },
      { name: 'Interactive', value: 1 },
      { name: 'Emergent', value: 1 },
      { name: 'Kind', value: 1 },
      { name: 'Hebrew Soul', value: 1 },
      { name: 'Christian Soul', value: 1 },
      { name: 'Islamic Soul', value: 1 },
      { name: 'God-Supplied', value: 1 },
      { name: 'Indian', value: 1 },
      { name: 'Indigenous', value: 1 },
      { name: 'Soul Realms', value: 1 },
      { name: 'Theosophy', value: 1 },
      { name: 'Steiner', value: 1 },
      { name: 'Nonphysical', value: 1 }
    ]
  },
  {
    name: 'Idealism',
    children: [
      { name: 'Indian', value: 1 },
      { name: 'Buddhism', value: 1 },
      { name: 'Dao', value: 1 },
      { name: 'Kastrup', value: 1 },
      { name: 'Hoffman', value: 1 },
      { name: 'McGilchrist', value: 1 },
      { name: 'Chopra', value: 1 },
      { name: 'Physical', value: 1 },
      { name: 'Goswami', value: 1 },
      { name: 'Spira', value: 1 },
      { name: 'Nader', value: 1 },
      { name: 'Ward', value: 1 },
      { name: 'Albahari', value: 1 },
      { name: 'Meijer', value: 1 },
      { name: 'Imaginative', value: 1 }
    ]
  },
  {
    name: 'Anomalous',
    children: [
      { name: 'Bergson', value: 1 },
      { name: 'Jung', value: 1 },
      { name: 'Radin', value: 1 },
      { name: 'Tart', value: 1 },
      { name: 'Josephson', value: 1 },
      { name: 'Wilber', value: 1 },
      { name: 'Combs', value: 1 },
      { name: 'Schooler', value: 1 },
      { name: 'Sheldrake', value: 1 },
      { name: 'Grinberg', value: 1 },
      { name: 'Graboi', value: 1 },
      { name: 'NDE', value: 1 },
      { name: 'DOPS', value: 1 },
      { name: 'Bitbol', value: 1 },
      { name: 'Campbell', value: 1 },
      { name: 'Hiller', value: 1 },
      { name: 'Harp', value: 1 },
      { name: 'Swimme', value: 1 },
      { name: 'Langan', value: 1 },
      { name: 'Meditation', value: 1 },
      { name: 'Psychedelic', value: 1 }
    ]
  },
  {
    name: 'Challenge',
    children: [
      { name: 'Nagel', value: 1 },
      { name: 'McGinn', value: 1 },
      { name: 'S. Harris', value: 1 },
      { name: 'Eagleman', value: 1 },
      { name: 'Tallis', value: 1 },
      { name: 'Nagasawa', value: 1 },
      { name: 'Musser', value: 1 },
      { name: 'Davies', value: 1 }
    ]
  }
]

// Get current data with applied palette
export const getCurrentData = () => {
  return applyPaletteToData(baseData)
}

// Function to check if device is mobile
const isMobile = () => {
  const isMobileDevice = window.innerWidth <= 768
  console.log(`Screen width: ${window.innerWidth}, isMobile: ${isMobileDevice}`)
  return isMobileDevice
}

// Function to get chart options with current mobile state
export const getChartOptions = (): EChartsOption => {
  return {
    backgroundColor: 'transparent',
    title: {
      text: 'C-Atlas Chart',
      left: 'center',
      textStyle: {
        color: '#fff'
      }
    },
    // tooltip: {
    //   trigger: 'item',
    //   formatter: '{b}: {c}',
    //   transitionDuration: 0,
    //   backgroundColor: 'rgba(0, 0, 0, 0.8)',
    //   borderColor: '#333',
    //   textStyle: {
    //     color: '#fff'
    //   }
    // },
    animation: false,
    series: [
      {
        type: 'sunburst',
        data: getCurrentData(),
        sort: undefined,
        startAngle: 83.5,
        label: {
          rotate: 'radial',
          show: true
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
        levels: [
          {
            r0: '0%',
            r: '10%',
            itemStyle: {
              borderWidth: 1
            }
          },
          {
            r0: '10%',
            r: '40%',
            itemStyle: {
              borderWidth: 1
            }
          },
          {
            r0: '40%',
            r: '60%',
            itemStyle: {
              borderWidth: 1
            }
          },
          {
            r0: '60%',
            r: '65%',
            itemStyle: {
              borderWidth: 1
            }
          }
        ]
      }
    ]
  }
}

// Legacy chart options (kept for backward compatibility)
export const chartOptions: EChartsOption = getChartOptions()

