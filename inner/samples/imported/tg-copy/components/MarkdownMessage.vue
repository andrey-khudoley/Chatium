<template>
  <div class="markdown-message" v-html="renderedMarkdown" @click="handleMentionClick"></div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  participants: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['mention-click'])

// Экранирование HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Обработка markdown для обычного текста (без ссылок и кода)
function processMarkdown(text) {
  let result = text
  
  // Жирный текст (**text**)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // Курсив (*text* или _text_)
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>')
  
  // Зачеркнутый (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  
  // Заголовки
  result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  
  // Цитаты
  result = result.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  
  return result
}

// Проверяем, является ли позиция валидной для упоминания (не часть email)
function isValidMentionPosition(text, index) {
  // Проверяем символ перед @
  if (index === 0) return true // Начало строки - всегда валидно
  
  const charBefore = text[index - 1]
  // Валидно если перед @: пробел, начало строки, или не-alphanumeric символ (кроме _)
  return /\s/.test(charBefore) || /[^a-zA-Z0-9_]/.test(charBefore)
}

// Парсим email адреса в тексте
function parseEmails(text) {
  // Простой regex для email: буквы/цифры/спецсимволы @ домен . зона
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const emails = []
  let match
  
  while ((match = emailRegex.exec(text)) !== null) {
    emails.push({
      fullMatch: match[0],
      index: match.index,
      length: match[0].length
    })
  }
  
  return emails
}

// Парсим упоминания в тексте
function parseMentions(text) {
  // Сначала находим все email адреса, чтобы исключить их
  const emails = parseEmails(text)
  
  // Формат: @[Имя](userId) или @username
  // Используем lookbehind для проверки позиции перед @
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)|@(\w+)/g
  const mentions = []
  let match
  
  while ((match = mentionRegex.exec(text)) !== null) {
    // Проверяем, не попадает ли это совпадение внутрь email адреса
    const isInsideEmail = emails.some(email => 
      match.index >= email.index && match.index < email.index + email.length
    )
    
    if (isInsideEmail) continue
    
    // Проверяем валидность позиции (не часть email слева)
    if (!isValidMentionPosition(text, match.index)) continue
    
    if (match[1] && match[2]) {
      // Формат @[Имя](userId)
      mentions.push({
        fullMatch: match[0],
        name: match[1],
        userId: match[2],
        username: null,
        index: match.index,
        length: match[0].length
      })
    } else if (match[3]) {
      // Формат @username
      mentions.push({
        fullMatch: match[0],
        name: null,
        userId: null,
        username: match[3],
        index: match.index,
        length: match[0].length
      })
    }
  }
  
  return mentions
}

// Преобразуем упоминания в HTML
function renderMentions(text) {
  const mentions = parseMentions(text)
  if (mentions.length === 0) return text
  
  let result = ''
  let lastIndex = 0
  
  for (const mention of mentions) {
    // Добавляем текст до упоминания
    result += text.slice(lastIndex, mention.index)
    
    // Создаём HTML для упоминания
    const displayName = mention.name || mention.username
    const userId = mention.userId || mention.username
    result += `<span class="mention-link" data-user-id="${escapeHtml(userId)}" data-username="${escapeHtml(mention.username || '')}">@${escapeHtml(displayName)}</span>`
    
    lastIndex = mention.index + mention.length
  }
  
  // Добавляем оставшийся текст
  result += text.slice(lastIndex)
  
  return result
}

// Проверяем, содержит ли текст HTML-теги
function isHtmlContent(text) {
  // Ищем HTML-теги
  return /<[a-z][\s\S]*>/i.test(text)
}

// Парсим markdown путем разбиения на токены
const renderedMarkdown = computed(() => {
  if (!props.text) return ''
  
  let text = props.text
  
  // Если текст уже содержит HTML - возвращаем как есть (только обрабатываем упоминания)
  if (isHtmlContent(text)) {
    return renderMentions(text)
  }
  const tokens = []
  
  // Сначала ищем упоминания @[Имя](userId) - они должны быть до markdown ссылок
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  let mentionMatch
  const mentions = []
  
  while ((mentionMatch = mentionRegex.exec(text)) !== null) {
    mentions.push({
      fullMatch: mentionMatch[0],
      name: mentionMatch[1],
      userId: mentionMatch[2],
      index: mentionMatch.index,
      length: mentionMatch[0].length
    })
  }
  
  // Регулярка для поиска всех специальных элементов (кроме упоминаний @[...], они уже найдены)
  // Email должен проверяться перед обычными ссылками, чтобы избежать конфликтов
  // Добавлена обработка markdown-ссылок [текст](url)
  const regex = /(```([\s\S]*?)```)|(`([^`]+)`)|\[([^\]]+)\]\(([^)]+)\)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/[^\s]+)/g
  
  let lastIndex = 0
  let match
  
  // Обрабатываем текст с учётом найденных упоминаний
  let lastMentionIndex = 0
  let currentMention = 0
  
  while ((match = regex.exec(text)) !== null) {
    // Проверяем, нет ли упоминания между lastIndex и текущим совпадением
    while (currentMention < mentions.length && mentions[currentMention].index < match.index) {
      const mention = mentions[currentMention]
      
      // Добавляем текст до упоминания
      if (mention.index > lastIndex) {
        tokens.push({ type: 'text', content: text.slice(lastIndex, mention.index) })
      }
      
      // Добавляем упоминание
      tokens.push({ type: 'mention', name: mention.name, userId: mention.userId })
      
      lastIndex = mention.index + mention.length
      currentMention++;
    }
    
    // Добавляем обычный текст до совпадения
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index)
      tokens.push({ type: 'text', content: plainText })
    }
    
    if (match[1]) {
      // Блок кода ```code```
      tokens.push({ type: 'code-block', code: match[2] })
    } else if (match[3]) {
      // Inline код `code`
      tokens.push({ type: 'inline-code', code: match[4] })
    } else if (match[5] && match[6]) {
      // Markdown-ссылка [текст](url)
      tokens.push({ type: 'md-link', text: match[5], url: match[6] })
    } else if (match[7]) {
      // Email адрес
      tokens.push({ type: 'email', email: match[7] })
    } else if (match[8]) {
      // Автоссылка
      tokens.push({ type: 'auto-link', url: match[8] })
    }
    
    lastIndex = regex.lastIndex
  }
  
  // Добавляем оставшиеся упоминания после последнего совпадения
  while (currentMention < mentions.length) {
    const mention = mentions[currentMention]
    
    if (mention.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, mention.index) })
    }
    
    tokens.push({ type: 'mention', name: mention.name, userId: mention.userId })
    
    lastIndex = mention.index + mention.length
    currentMention++;
  }
  
  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) })
  }
  
  // Обрабатываем токены
  const processed = tokens.map(token => {
    switch (token.type) {
      case 'md-link':
        // Дополнительная проверка - если URL выглядит как userId, не делаем ссылку
        // (это может быть упоминание, которое не попало в regex)
        if (token.url && !token.url.includes('/') && !token.url.includes('.')) {
          return escapeHtml(token.text)
        }
        return `<a href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.text)}</a>`
      
      case 'mention':
        return `<span class="mention-link" data-user-id="${escapeHtml(token.userId)}" data-username="">@${escapeHtml(token.name)}</span>`
      
      case 'auto-link':
        return `<a href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.url)}</a>`
      
      case 'email':
        return `<a href="mailto:${escapeHtml(token.email)}" class="email-link">${escapeHtml(token.email)}</a>`
      
      case 'code-block':
        return `<pre><code>${escapeHtml(token.code)}</code></pre>`
      
      case 'inline-code':
        return `<code>${escapeHtml(token.code)}</code>`
      
      case 'text':
      default:
        // Обрабатываем упоминания и применяем markdown
        const withMentions = renderMentions(token.content)
        return processMarkdown(withMentions)
    }
  })
  
  let result = processed.join('')
  
  // Обрабатываем списки и переносы строк
  const lines = result.split('\n')
  let inList = false
  let listType = null
  const htmlLines = []
  
  for (let line of lines) {
    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/)
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/)
    
    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>')
        htmlLines.push('<ul>')
        inList = true
        listType = 'ul'
      }
      htmlLines.push(`<li>${unorderedMatch[1]}</li>`)
    } else if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>')
        htmlLines.push('<ol>')
        inList = true
        listType = 'ol'
      }
      htmlLines.push(`<li>${orderedMatch[2]}</li>`)
    } else {
      if (inList) {
        htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>')
        inList = false
        listType = null
      }
      htmlLines.push(line)
    }
  }
  
  if (inList) {
    htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>')
  }
  
  result = htmlLines.join('\n')
  
  // Переносы строк (кроме случаев с блочными элементами)
  result = result.replace(/\n/g, '<br>')
  result = result.replace(/(<\/h[1-6]>|<\/blockquote>|<\/pre>|<\/ul>|<\/ol>)<br>/g, '$1')
  result = result.replace(/<br>(<h[1-6]>|<blockquote>|<pre>|<ul>|<ol>)/g, '$1')
  
  return result
})

// Обработка клика по упоминанию
function handleMentionClick(event) {
  const target = event.target
  if (target.classList.contains('mention-link')) {
    event.preventDefault()
    event.stopPropagation()
    const userId = target.getAttribute('data-user-id')
    const username = target.getAttribute('data-username')
    if (userId) {
      emit('mention-click', { userId, username })
    }
  }
}
</script>

<style scoped>
.markdown-message {
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.markdown-message :deep(h1),
.markdown-message :deep(h2),
.markdown-message :deep(h3) {
  margin: 8px 0 4px;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-message :deep(h1) {
  font-size: 1.3em;
}

.markdown-message :deep(h2) {
  font-size: 1.15em;
}

.markdown-message :deep(h3) {
  font-size: 1.05em;
}

.markdown-message :deep(strong) {
  font-weight: 600;
}

.markdown-message :deep(em) {
  font-style: italic;
}

.markdown-message :deep(del) {
  text-decoration: line-through;
  opacity: 0.7;
}

.markdown-message :deep(code) {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.9em;
  background: var(--bg-hover);
  padding: 2px 5px;
  border-radius: 4px;
  word-break: break-all;
}

.markdown-message :deep(pre) {
  background: var(--bg-hover);
  padding: 10px 12px;
  border-radius: 8px;
  margin: 8px 0;
  overflow-x: auto;
}

.markdown-message :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.85em;
  white-space: pre;
  word-break: normal;
}

.markdown-message :deep(blockquote) {
  border-left: 3px solid var(--accent-color);
  margin: 8px 0;
  padding: 4px 12px;
  background: var(--accent-light);
  border-radius: 0 6px 6px 0;
}

.markdown-message :deep(ul),
.markdown-message :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}

.markdown-message :deep(li) {
  margin: 2px 0;
}

.markdown-message :deep(a) {
  color: var(--accent-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-message :deep(a:hover) {
  border-bottom-color: var(--accent-color);
}

.markdown-message :deep(.mention-link) {
  color: var(--accent-color, #008069);
  font-weight: 500;
  cursor: pointer;
  background: var(--accent-light, rgba(0, 128, 105, 0.1));
  padding: 1px 4px;
  border-radius: 4px;
  transition: background 0.2s;
  user-select: text;
}

.markdown-message :deep(.mention-link:hover) {
  background: var(--accent-light-hover, rgba(0, 128, 105, 0.2));
  text-decoration: none;
}

.markdown-message :deep(.email-link) {
  color: var(--accent-color, #008069);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-message :deep(.email-link:hover) {
  border-bottom-color: var(--accent-color);
}

.markdown-message :deep(br) {
  display: block;
  content: "";
  margin-top: 4px;
}

/* Адаптация для темной темы через CSS переменные */
/* Теперь используются переменные темы, дополнительных медиа-запросов не требуется */
</style>