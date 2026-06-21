// @shared
// Серверный рендеринг markdown в HTML - простой парсер для SSR

// Простой markdown парсер для SSR (работает без внешних библиотек)
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return ''
  
  try {
    let html = markdown
    
    // Экранируем HTML теги сначала
    html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
    
    // Headers (должны быть в начале строки)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    
    // Жирный текст
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
    
    // Курсив
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    html = html.replace(/_(.+?)_/g, '<em>$1</em>')
    
    // Inline код
    html = html.replace(/`(.+?)`/g, '<code>$1</code>')
    
    // Ссылки [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // Горизонтальная линия
    html = html.replace(/^---$/gm, '<hr>')
    html = html.replace(/^___$/gm, '<hr>')
    html = html.replace(/^\*\*\*$/gm, '<hr>')
    
    // Code blocks (```language ... ```)
    html = html.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      return `<pre><code>${code}</code></pre>`
    })
    
    // Списки (упрощенно)
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>')
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    
    // Оборачиваем последовательные <li> в <ul>
    html = html.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => {
      return `<ul>${match}</ul>`
    })
    
    // Параграфы - разделяем по двойным переносам строк
    const lines = html.split('\n')
    const paragraphs: string[] = []
    let currentParagraph = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Пропускаем пустые строки и уже обработанные теги
      if (!trimmed) {
        if (currentParagraph) {
          // Не оборачиваем в <p>, если это уже HTML тег
          if (!currentParagraph.match(/^<(h[1-6]|ul|ol|pre|hr|div|blockquote)/)) {
            paragraphs.push(`<p>${currentParagraph}</p>`)
          } else {
            paragraphs.push(currentParagraph)
          }
          currentParagraph = ''
        }
        continue
      }
      
      // Если это HTML тег, добавляем как есть
      if (trimmed.match(/^<(h[1-6]|ul|ol|pre|hr|div|blockquote)/)) {
        if (currentParagraph) {
          paragraphs.push(`<p>${currentParagraph}</p>`)
          currentParagraph = ''
        }
        paragraphs.push(trimmed)
      } else {
        if (currentParagraph) currentParagraph += ' '
        currentParagraph += trimmed
      }
    }
    
    // Добавляем последний параграф
    if (currentParagraph) {
      if (!currentParagraph.match(/^<(h[1-6]|ul|ol|pre|hr|div|blockquote)/)) {
        paragraphs.push(`<p>${currentParagraph}</p>`)
      } else {
        paragraphs.push(currentParagraph)
      }
    }
    
    return paragraphs.join('\n')
  } catch (e) {
    // При ошибке возвращаем экранированный markdown в pre
    return `<pre>${markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
  }
}

