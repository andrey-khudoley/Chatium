// @shared

export interface LibraryItem {
  id: string
  title: string
  author: string
  type: 'article' | 'book' | 'note' | 'video'
  status: 'reading' | 'done' | 'queue'
  progress: number
  tags: string[]
  summary: string
  highlights?: string[]
}
