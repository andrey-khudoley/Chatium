// @shared

import { ref, nextTick } from 'vue'

export interface PositionOptions {
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  alignment?: 'start' | 'center' | 'end'
  offset?: number
  fallbackPlacements?: Array<'top' | 'bottom' | 'left' | 'right'>
}

export interface Position {
  x: number
  y: number
  placement: string
  fits: boolean
}

const defaultOptions: PositionOptions = {
  placement: 'auto',
  alignment: 'start',
  offset: 8,
  fallbackPlacements: ['top', 'bottom', 'left', 'right'],
}

export function useSmartPosition() {
  const position = ref<Position>({ x: 0, y: 0, placement: 'bottom', fits: true })

  function calculatePosition(
    triggerRect: DOMRect,
    popupRect: { width: number; height: number },
    options: PositionOptions = {}
  ): Position {
    const opts = { ...defaultOptions, ...options }
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    const placements = opts.placement === 'auto' 
      ? opts.fallbackPlacements! 
      : [opts.placement!, ...opts.fallbackPlacements!.filter(p => p !== opts.placement)]

    for (const placement of placements) {
      const pos = getPositionForPlacement(triggerRect, popupRect, placement, opts.alignment!, opts.offset!)
      
      // Проверяем, помещается ли popup в viewport
      const fits = 
        pos.x >= 0 && 
        pos.y >= 0 && 
        pos.x + popupRect.width <= viewport.width && 
        pos.y + popupRect.height <= viewport.height

      if (fits) {
        return { ...pos, placement, fits: true }
      }
    }

    // Если ничего не помещается, используем placement с минимальным выходом за границы
    const bestPos = getBestFittingPosition(triggerRect, popupRect, placements[0], opts)
    return { ...bestPos, placement: placements[0], fits: false }
  }

  function getPositionForPlacement(
    triggerRect: DOMRect,
    popupRect: { width: number; height: number },
    placement: string,
    alignment: string,
    offset: number
  ): { x: number; y: number } {
    let x = 0
    let y = 0

    switch (placement) {
      case 'bottom':
        y = triggerRect.bottom + offset
        x = getAlignedX(triggerRect, popupRect.width, alignment)
        break
      case 'top':
        y = triggerRect.top - popupRect.height - offset
        x = getAlignedX(triggerRect, popupRect.width, alignment)
        break
      case 'right':
        x = triggerRect.right + offset
        y = getAlignedY(triggerRect, popupRect.height, alignment)
        break
      case 'left':
        x = triggerRect.left - popupRect.width - offset
        y = getAlignedY(triggerRect, popupRect.height, alignment)
        break
    }

    return { x, y }
  }

  function getAlignedX(triggerRect: DOMRect, popupWidth: number, alignment: string): number {
    switch (alignment) {
      case 'start':
        return triggerRect.left
      case 'center':
        return triggerRect.left + (triggerRect.width - popupWidth) / 2
      case 'end':
        return triggerRect.right - popupWidth
      default:
        return triggerRect.left
    }
  }

  function getAlignedY(triggerRect: DOMRect, popupHeight: number, alignment: string): number {
    switch (alignment) {
      case 'start':
        return triggerRect.top
      case 'center':
        return triggerRect.top + (triggerRect.height - popupHeight) / 2
      case 'end':
        return triggerRect.bottom - popupHeight
      default:
        return triggerRect.top
    }
  }

  function getBestFittingPosition(
    triggerRect: DOMRect,
    popupRect: { width: number; height: number },
    placement: string,
    options: PositionOptions
  ): { x: number; y: number } {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let pos = getPositionForPlacement(triggerRect, popupRect, placement, options.alignment!, options.offset!)

    // Корректируем позицию чтобы не выходить за границы viewport
    pos.x = Math.max(10, Math.min(pos.x, viewport.width - popupRect.width - 10))
    pos.y = Math.max(10, Math.min(pos.y, viewport.height - popupRect.height - 10))

    return pos
  }

  // Для контекстного меню (по координатам клика)
  function calculatePositionFromPoint(
    clickX: number,
    clickY: number,
    popupRect: { width: number; height: number },
    offset: number = 0
  ): Position {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let x = clickX + offset
    let y = clickY + offset

    // Если выходит за правый край — открываем влево от курсора
    if (x + popupRect.width > viewport.width - 10) {
      x = clickX - popupRect.width - offset
    }

    // Если выходит за нижний край — открываем вверх от курсора
    if (y + popupRect.height > viewport.height - 10) {
      y = clickY - popupRect.height - offset
    }

    // Гарантируем минимальные отступы
    x = Math.max(10, x)
    y = Math.max(10, y)

    return { x, y, placement: 'bottom', fits: true }
  }

  async function updatePosition(
    triggerElement: HTMLElement | null,
    popupElement: HTMLElement | null,
    options: PositionOptions = {}
  ) {
    if (!triggerElement || !popupElement) return

    await nextTick()

    const triggerRect = triggerElement.getBoundingClientRect()
    const popupRect = popupElement.getBoundingClientRect()

    position.value = calculatePosition(triggerRect, { width: popupRect.width, height: popupRect.height }, options)
  }

  return {
    position,
    calculatePosition,
    calculatePositionFromPoint,
    updatePosition,
  }
}
