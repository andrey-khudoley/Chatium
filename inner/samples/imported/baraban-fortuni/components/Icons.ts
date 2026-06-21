// @shared
import { defineComponent, h } from 'vue'

const createIcon = (paths: string[], poly?: string) =>
  defineComponent({
    render() {
      const pathElements = paths.map((d) => h('path', { d }))
      const polyElement = poly ? h('polygon', { points: poly }) : null
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          width: '24',
          height: '24',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        },
        [...pathElements, polyElement]
      )
    }
  })

export const HealthIcon = createIcon(['M12 5v14', 'M5 12h14'])

export const GroceriesIcon = createIcon([
  'm5 11 4-7',
  'm19 11-4-7',
  'M2 11h20',
  'm3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4',
  'm9 11 1 9',
  'M4.5 15.5h15',
  'm15 11-1 9'
])

export const TravelIcon = defineComponent({
  render() {
    return h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '24',
        height: '24',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      },
      [
        h('circle', { cx: '12', cy: '12', r: '10' }),
        h('path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }),
        h('path', { d: 'M2 12h20' })
      ]
    )
  }
})

export const EntertainmentIcon = createIcon(
  [],
  '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'
)

export const MarketIcon = createIcon([
  'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z',
  'M3 6h18',
  'M16 10a4 4 0 0 1-8 0'
])

export const CafeIcon = defineComponent({
  render() {
    return h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '24',
        height: '24',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      },
      [
        h('path', { d: 'M17 8h1a4 4 0 1 1 0 8h-1' }),
        h('path', { d: 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z' }),
        h('line', { x1: '6', y1: '2', x2: '6', y2: '4' }),
        h('line', { x1: '10', y1: '2', x2: '10', y2: '4' }),
        h('line', { x1: '14', y1: '2', x2: '14', y2: '4' })
      ]
    )
  }
})

export const TransportIcon = defineComponent({
  render() {
    return h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '24',
        height: '24',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      },
      [
        h('path', {
          d: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2'
        }),
        h('circle', { cx: '7', cy: '17', r: '2' }),
        h('path', { d: 'M9 17h6' }),
        h('circle', { cx: '17', cy: '17', r: '2' })
      ]
    )
  }
})

export const HomeIcon = createIcon(
  ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  '9 22 9 12 15 12 15 22'
)
