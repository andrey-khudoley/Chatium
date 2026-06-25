// @shared

export interface Budget {
  name: string
  spent: number
  limit: number
}

export interface Transaction {
  id: string
  name: string
  cat: string
  date: string
  amt: number
}

export interface SpendBar {
  m: string
  v: number
}

export interface WeekBar {
  d: string
  v: number
}
