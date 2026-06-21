import Documents from '../tables/documents.table'
import { requireAnyUser, requireAccountRole } from '@app/auth'
import { nanoid } from '@app/nanoid'

export interface DocumentDto {
  id: string
  title: string
  slug: string
  type: 'page' | 'section'
  mdxCode?: string
  userId: string
  parentId?: string
  order: number
  icon?: string
  imageHash?: string
  isPublished?: boolean
  createdAt: Date
  updatedAt: Date
}

// @shared-route
export const apiDocumentsRootRoute = app.get('/root', async (ctx, req) => {
  const rootDocuments = await Documents.findAll(ctx, {
    where: {
      parentId: null
    },
    limit: 1,
    order: [{ order: 'asc' }]
  })

  return rootDocuments.length > 0 ? rootDocuments[0] : null
})

// @shared-route
export const apiDocumentsListRoute = app.get('/list', async (ctx, req) => {
  const documents = await Documents.findAll(ctx, {
    limit: 1000,
    order: [{ order: 'asc' }, { title: 'asc' }]
  })

  return documents
})

// @shared-route
export const apiDocumentsTreeRoute = app.get('/tree', async (ctx, req) => {
  const parentId = req.query.parentId // Optional: filter by specific parent section

  const documents = await Documents.findAll(ctx, { limit: 1000 })

  // If parentId provided, return that section's children
  if (parentId) {
    const parent = documents.find((d) => d.id === parentId)
    if (!parent) return []

    return buildChildrenTree(documents, parentId)
  }

  // Build tree structure for top-level items only (no parentId)
  const topLevelItems = documents
    .filter((d) => !d.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item) => ({
      type: item.type,
      id: item.id,
      title: item.title,
      slug: item.slug,
      order: item.order,
      icon: item.icon || null,
      imageHash: item.imageHash || null,
      isPublished: item.isPublished ?? true,
      parentId: typeof item.parentId === 'string' ? item.parentId : item.parentId?.id || null,
      children: item.type === 'section' ? buildChildrenTree(documents, item.id) : []
    }))

  return topLevelItems
})

function buildChildrenTree(documents: any[], parentId: string): any[] {
  return documents
    .filter((doc) => {
      const docParentId = typeof doc.parentId === 'string' ? doc.parentId : doc.parentId?.id
      return docParentId === parentId
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((doc) => ({
      type: doc.type,
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      order: doc.order,
      icon: doc.icon || null,
      imageHash: doc.imageHash || null,
      isPublished: doc.isPublished ?? true,
      parentId: typeof doc.parentId === 'string' ? doc.parentId : doc.parentId?.id || null,
      children: buildChildrenTree(documents, doc.id)
    }))
}

// @shared-route
export const apiDocumentByIdRoute = app.get('/:id', async (ctx, req) => {
  const document = await Documents.findById(ctx, req.params.id)
  if (!document) return null

  // Get full path (all ancestors from root to this document)
  const path = await getDocumentPath(ctx, document)

  // Build slug-based URL if all elements have slug
  const slugPath = buildSlugPath(path)

  return {
    document,
    path, // array of ancestors: [root, ..., parent, self]
    slugPath // slug-based path like 'getting-started/installation' or null
  }
})

// Helper function to find document by slug path
// Optimized: loads documents sequentially by slug instead of loading all at once
export async function findDocumentBySlugPath(ctx: any, slugs: string[]): Promise<any | null> {
  let current: any = null
  let currentParentId: string | null = null

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]

    // Find document with this slug and correct parent (sequential query)
    const candidates = await Documents.findAll(ctx, {
      where: {
        slug: slug,
        parentId: currentParentId
      },
      limit: 1
    })

    if (candidates.length === 0) return null

    current = candidates[0]
    currentParentId = current.id
  }

  return current
}

// Helper function to build slug path from document path array
function buildSlugPath(path: any[]): string | null {
  // Check if all documents in path have slug
  const allHaveSlugs = path.every((doc) => doc.slug && doc.slug.trim().length > 0)

  if (!allHaveSlugs) return null

  // Build slug path
  return path.map((doc) => doc.slug).join('/')
}

// Helper function to get full path of a document
export async function getDocumentPath(ctx: any, document: any): Promise<any[]> {
  const path = [document]
  let current = document
  let iterations = 0
  const maxIterations = 100

  while (current && iterations < maxIterations) {
    iterations++
    const parentId = typeof current.parentId === 'string' ? current.parentId : current.parentId?.id

    if (!parentId) break

    const parent = await Documents.findById(ctx, parentId)
    if (!parent) break

    path.unshift(parent) // Add to beginning
    current = parent
  }

  return path
}

// @shared-route
export const apiDocumentCreateRoute = app.post('/create', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const user = ctx.user

  // Validate: pages must have a parent
  if (req.body.type === 'page' && !req.body.parentId) {
    throw new Error('Страница должна иметь родительский элемент')
  }

  // Use provided slug or generate from title
  let slug =
    req.body.slug && req.body.slug.trim() !== ''
      ? req.body.slug
      : req.body.title
          .toLowerCase()
          .replace(/[^a-zа-яё0-9\s-]/gi, '')
          .replace(/\s+/g, '-')
          .substring(0, 100)

  let defaultMdxCode = ''

  // Only create content for pages, not sections
  if (req.body.type === 'page') {
    defaultMdxCode = `# ${req.body.title || 'Untitled'}\n\n`
  }

  // Get max order for this parent
  const siblings = await Documents.findAll(ctx, {
    where: {
      parentId: req.body.parentId || null
    },
    limit: 1000
  })
  const maxOrder = siblings.reduce((max, doc) => Math.max(max, doc.order || 0), 0)

  const document = await Documents.create(ctx, {
    title: req.body.title || 'Untitled',
    slug: slug || nanoid(),
    type: req.body.type || 'page',
    mdxCode: defaultMdxCode,
    userId: user.id,
    parentId: req.body.parentId || null,
    order: maxOrder + 1,
    isPublished: req.body.isPublished ?? false // Использовать значение из запроса или false по умолчанию
  })

  return document
})

// @shared-route
export const apiDocumentUpdateRoute = app.post('/update/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  console.log('apiDocumentUpdateRoute received:', {
    id: req.params.id,
    body: req.body,
    mdxCodeLength: req.body.mdxCode?.length || 0
  })

  // Get current document to check type
  const currentDocument = await Documents.findById(ctx, req.params.id)

  const updateData: any = {
    id: req.params.id
  }

  if (req.body.title !== undefined) updateData.title = req.body.title
  if (req.body.slug !== undefined) updateData.slug = req.body.slug
  if (req.body.type !== undefined) updateData.type = req.body.type
  if (req.body.mdxCode !== undefined) updateData.mdxCode = req.body.mdxCode
  if (req.body.parentId !== undefined) updateData.parentId = req.body.parentId
  if (req.body.order !== undefined) updateData.order = req.body.order
  if (req.body.icon !== undefined) updateData.icon = req.body.icon
  if (req.body.imageHash !== undefined) updateData.imageHash = req.body.imageHash
  if (req.body.isPublished !== undefined) updateData.isPublished = req.body.isPublished

  console.log('updateData to be saved:', updateData)

  // Determine final type and parentId
  const finalType = updateData.type !== undefined ? updateData.type : currentDocument.type
  const finalParentId =
    updateData.parentId !== undefined
      ? updateData.parentId
      : typeof currentDocument.parentId === 'string'
        ? currentDocument.parentId
        : currentDocument.parentId?.id

  // Validate: pages must have a parent
  if (finalType === 'page' && !finalParentId) {
    throw new Error('Страница должна иметь родительский элемент')
  }

  const document = await Documents.update(ctx, updateData)

  console.log('Document updated, result:', {
    id: document.id,
    title: document.title,
    mdxCodeLength: document.mdxCode?.length || 0
  })

  return document
})

// @shared-route
export const apiDocumentDeleteRoute = app.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await Documents.delete(ctx, req.params.id)
  return { success: true }
})

// @shared-route
export const apiDocumentMoveRoute = app.post('/move/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const documentId = req.params.id
  const { targetParentId, targetOrder } = req.body

  // Get the document being moved
  const document = await Documents.findById(ctx, documentId)

  // Validate: pages must have a parent
  if (document.type === 'page' && !targetParentId) {
    throw new Error('Страница должна иметь родительский элемент')
  }

  // If targetOrder is provided, use it (for reordering)
  if (targetOrder !== null && targetOrder !== undefined) {
    await Documents.update(ctx, {
      id: documentId,
      parentId: targetParentId !== undefined ? targetParentId : null,
      order: targetOrder
    })

    // Reindex orders in this context to make them sequential integers
    await reindexOrders(ctx, targetParentId)
  } else {
    // Get max order for target location
    const siblings = await Documents.findAll(ctx, {
      where: {
        parentId: targetParentId !== undefined ? targetParentId : null
      },
      limit: 1000
    })
    const maxOrder = siblings.reduce((max, doc) => Math.max(max, doc.order || 0), 0)

    // Update document with new parent and order at the end
    await Documents.update(ctx, {
      id: documentId,
      parentId: targetParentId !== undefined ? targetParentId : null,
      order: maxOrder + 1
    })
  }

  const updatedDocument = await Documents.findById(ctx, documentId)
  return updatedDocument
})

// Helper function to reindex orders in a given context
async function reindexOrders(ctx: any, parentId: string | null) {
  const siblings = await Documents.findAll(ctx, {
    where: {
      parentId: parentId !== undefined ? parentId : null
    },
    limit: 1000
  })

  // Sort by current order
  const sorted = siblings.sort((a, b) => (a.order || 0) - (b.order || 0))

  // Update with sequential orders
  for (let i = 0; i < sorted.length; i++) {
    await Documents.update(ctx, {
      id: sorted[i].id,
      order: (i + 1) * 10 // Use multiples of 10 for easier future insertions
    })
  }
}

// @shared-route
export const apiDocumentSearchRoute = app.get('/search', async (ctx, req) => {
  const query = req.query.q || ''
  if (!query || query.length < 2) {
    return []
  }

  const results = await Documents.searchBy(ctx, {
    query: query,
    limit: 20
  })

  return results.filter((doc) => doc.type === 'page')
})

// Helper function to find first page in a section (recursive)
async function findFirstPageInSection(ctx: any, sectionId: string): Promise<any | null> {
  const children = await Documents.findAll(ctx, {
    where: {
      parentId: sectionId
    },
    limit: 1000,
    order: [{ order: 'asc' }]
  })

  // First, look for direct page children
  for (const child of children) {
    if (child.type === 'page') {
      return child
    }
  }

  // If no pages, recursively search in sections
  for (const child of children) {
    if (child.type === 'section') {
      const nestedPage = await findFirstPageInSection(ctx, child.id)
      if (nestedPage) {
        return nestedPage
      }
    }
  }

  return null
}

// @shared-route
export const apiDocumentsSeedRoute = app.post('/seed', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const user = ctx.user

  // Check if database is empty
  const existingDocs = await Documents.findAll(ctx, { limit: 1 })
  if (existingDocs.length > 0) {
    throw new Error('База данных уже содержит документы')
  }

  // Create 2 top-level sections
  const section1 = await Documents.create(ctx, {
    title: 'Начало работы',
    slug: 'getting-started',
    type: 'section',
    mdxCode: '',
    userId: user.id,
    parentId: null,
    order: 10,
    isPublished: true
  })

  const section2 = await Documents.create(ctx, {
    title: 'Руководства',
    slug: 'guides',
    type: 'section',
    mdxCode: '',
    userId: user.id,
    parentId: null,
    order: 20,
    isPublished: true
  })

  // Create 2 subsections in first section
  const subsection1 = await Documents.create(ctx, {
    title: 'Основы',
    slug: 'basics',
    type: 'section',
    mdxCode: '',
    userId: user.id,
    parentId: section1.id,
    order: 10,
    isPublished: true
  })

  const subsection2 = await Documents.create(ctx, {
    title: 'Продвинутые темы',
    slug: 'advanced',
    type: 'section',
    mdxCode: '',
    userId: user.id,
    parentId: section1.id,
    order: 20,
    isPublished: true
  })

  // Create 3 pages in first section (subsection1)
  await Documents.create(ctx, {
    title: 'Введение',
    slug: 'introduction',
    type: 'page',
    mdxCode: `# Введение

Добро пожаловать в документацию!

## Что это?

Это пример документации, созданной с помощью Chatium Documentation Editor.

## Возможности

- Редактирование в формате MDX
- Иерархическая структура документов
- Полнотекстовый поиск
- Адаптивный дизайн

## Начало работы

Изучите разделы в боковом меню, чтобы узнать больше.`,
    userId: user.id,
    parentId: subsection1.id,
    order: 10,
    isPublished: true
  })

  await Documents.create(ctx, {
    title: 'Установка',
    slug: 'installation',
    type: 'page',
    mdxCode: `# Установка

## Требования

- Современный браузер
- Доступ к аккаунту Chatium

## Шаги установки

1. Войдите в свой аккаунт Chatium
2. Создайте новый workspace
3. Выберите шаблон "Documentation"
4. Начните редактирование!

## Что дальше?

Прочитайте руководство по быстрому старту.`,
    userId: user.id,
    parentId: subsection1.id,
    order: 20,
    isPublished: true
  })

  await Documents.create(ctx, {
    title: 'Быстрый старт',
    slug: 'quick-start',
    type: 'page',
    mdxCode: `# Быстрый старт

## Создание первой страницы

1. Нажмите кнопку "+ Add Page" в верхнем меню
2. Заполните название страницы
3. Нажмите "Сохранить"

## Редактирование контента

1. Переключитесь в режим редактирования (кнопка Edit в правом верхнем углу)
2. Выберите страницу в боковом меню
3. Редактируйте контент используя Markdown/MDX синтаксис
4. Сохраните изменения (Ctrl+S или кнопка Save)

## Организация структуры

Используйте секции для группировки связанных страниц:

- Секции могут содержать другие секции и страницы
- Перетаскивайте элементы для изменения порядка
- Используйте иконки для визуального оформления`,
    userId: user.id,
    parentId: subsection1.id,
    order: 30,
    isPublished: true
  })

  // Create 1 page in second subsection (subsection2)
  await Documents.create(ctx, {
    title: 'Редактор текста',
    slug: 'editor',
    type: 'page',
    mdxCode: `# Умный редактор текста

Редактировать документы можно в формате Markdown, который поддерживает картинки, видео и таблицы

## Основной синтаксис Markdown

### Заголовки

\`\`\`markdown
# Заголовок 1
## Заголовок 2
### Заголовок 3
\`\`\`

### Ссылки и изображения

[Текст ссылки](https://example.com)

![Альтернативный текст](https://msk.cdn-chatium.io/thumbnail/image_msk_VcBOAlZOv8.960x639.png/s/2048x)



### Списки

**Маркированный список:**
- Пункт 1
- Пункт 2
  - Подпункт 2.1
  - Подпункт 2.2

**Нумерованный список:**
1. Первый
2. Второй
3. Третий

### Код

Встроенный код: \`const x = 10\`

Блок кода:
\`\`\`javascript
function hello() {
  console.log('Hello, world!')
}
\`\`\`

### Цитаты

> Это цитата
> Может быть многострочной

### Таблицы

| Заголовок 1 | Заголовок 2 |
|------------|------------|
| Ячейка 1   | Ячейка 2   |
| Ячейка 3   | Ячейка 4   |

## Советы

- Используйте предпросмотр для проверки форматирования
- Сохраняйте изменения регулярно
- Используйте семантические заголовки для лучшей структуры`,
    userId: user.id,
    parentId: subsection2.id,
    order: 10,
    isPublished: true
  })

  return { success: true, message: 'База успешно заполнена примерными данными' }
})

// @shared-route
export const apiDocumentNextRoute = app.get('/next/:id', async (ctx, req) => {
  const currentDocument = await Documents.findById(ctx, req.params.id)
  if (!currentDocument) return null

  // First, check if current document has children
  const children = await Documents.findAll(ctx, {
    where: {
      parentId: currentDocument.id,
      type: 'page' // Only pages, not sections
    },
    limit: 1000,
    order: [{ order: 'asc' }]
  })

  // If has children, return first child
  if (children.length > 0) {
    const firstChild = children[0]
    const path = await getDocumentPath(ctx, firstChild)
    const slugPath = buildSlugPath(path)

    return {
      document: firstChild,
      path,
      slugPath
    }
  }

  // If no children, look for next sibling
  const parentId =
    typeof currentDocument.parentId === 'string'
      ? currentDocument.parentId
      : currentDocument.parentId?.id

  // Get all siblings (pages and sections) with the same parent
  const siblings = await Documents.findAll(ctx, {
    where: {
      parentId: parentId || null
    },
    limit: 1000,
    order: [{ order: 'asc' }]
  })

  // Find current document index
  const currentIndex = siblings.findIndex((doc) => doc.id === currentDocument.id)

  // Look for next sibling
  if (currentIndex !== -1 && currentIndex < siblings.length - 1) {
    const nextSibling = siblings[currentIndex + 1]

    // If next sibling is a page, return it
    if (nextSibling.type === 'page') {
      const path = await getDocumentPath(ctx, nextSibling)
      const slugPath = buildSlugPath(path)

      return {
        document: nextSibling,
        path,
        slugPath
      }
    }

    // If next sibling is a section, find first page inside
    if (nextSibling.type === 'section') {
      const firstPage = await findFirstPageInSection(ctx, nextSibling.id)
      if (firstPage) {
        const path = await getDocumentPath(ctx, firstPage)
        const slugPath = buildSlugPath(path)

        return {
          document: firstPage,
          path,
          slugPath
        }
      }
    }
  }

  // No next sibling - go up to parent and look for their next sibling
  if (parentId) {
    let currentParentId: string | null = parentId
    let iterations = 0
    const maxIterations = 10

    while (currentParentId && iterations < maxIterations) {
      iterations++

      const parent = await Documents.findById(ctx, currentParentId)
      if (!parent) break

      const grandParentId =
        typeof parent.parentId === 'string' ? parent.parentId : parent.parentId?.id

      // Get parent's siblings
      const parentSiblings = await Documents.findAll(ctx, {
        where: {
          parentId: grandParentId || null
        },
        limit: 1000,
        order: [{ order: 'asc' }]
      })

      // Find parent's index
      const parentIndex = parentSiblings.findIndex((doc) => doc.id === currentParentId)

      // Look for parent's next sibling
      if (parentIndex !== -1 && parentIndex < parentSiblings.length - 1) {
        const nextParentSibling = parentSiblings[parentIndex + 1]

        // If it's a section, find first page inside
        if (nextParentSibling.type === 'section') {
          const firstPage = await findFirstPageInSection(ctx, nextParentSibling.id)
          if (firstPage) {
            const path = await getDocumentPath(ctx, firstPage)
            const slugPath = buildSlugPath(path)

            return {
              document: firstPage,
              path,
              slugPath
            }
          }
        }

        // If it's a page, return it
        if (nextParentSibling.type === 'page') {
          const path = await getDocumentPath(ctx, nextParentSibling)
          const slugPath = buildSlugPath(path)

          return {
            document: nextParentSibling,
            path,
            slugPath
          }
        }
      }

      // Move up to grandparent
      currentParentId = grandParentId
    }
  }

  return null
})
