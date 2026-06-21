// @shared
import type { Component } from 'vue'

export interface Prize {
  id: number
  name: string
  label: string
  percentage: number
  color: string
  selectedColor: string
  icon: Component
}
