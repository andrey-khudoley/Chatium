import { findUsersByIds, requireAccountRole } from '@app/auth'
import { reporterApp } from '../shared/error-handler-middleware'
import EpisodeForms from '../tables/episode_forms.table'
import Episodes from '../tables/episodes.table'
import FormSubmissions from '../tables/form_submissions.table'
import Autowebinars from '../tables/autowebinars.table'

// @shared-route
export const apiFormSubmissionsRoute = reporterApp.get('/submissions', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const where: any = {}
  if (req.query.formId) where.form = req.query.formId
  if (req.query.episodeId) where.episode = req.query.episodeId
  if (req.query.autowebinarId) where.autowebinar = req.query.autowebinarId

  const mode = req.query.mode as string // 'episodes' | 'autowebinars'

  const page = parseInt(req.query.page as string) || 1
  const limit = 100
  const offset = (page - 1) * limit

  // Если mode задан, но нет явного фильтра по episode/autowebinar,
  // загружаем список ID для фильтрации на уровне запроса
  if (mode === 'autowebinars' && !where.autowebinar) {
    const allAws = await Autowebinars.findAll(ctx, { limit: 1000 })

    if (allAws.length > 0) {
      where.autowebinar = allAws.map((aw) => aw.id)
    } else {
      // Если нет ни одного автовебинара, вернуть пустой результат
      return {
        submissions: [],
        formsMap: {},
        episodesMap: {},
        autowebinarsMap: {},
        usersMap: {},
        totalCount: 0,
        page,
        limit,
        totalPages: 0
      }
    }
  } else if (mode === 'episodes' && !where.episode) {
    const allEps = await Episodes.findAll(ctx, { limit: 1000 })

    if (allEps.length > 0) {
      where.episode = allEps.map((ep) => ep.id)
    } else {
      // Если нет ни одного эфира, вернуть пустой результат
      return {
        submissions: [],
        formsMap: {},
        episodesMap: {},
        autowebinarsMap: {},
        usersMap: {},
        totalCount: 0,
        page,
        limit,
        totalPages: 0
      }
    }
  }

  const allSubmissions = await FormSubmissions.findAll(ctx, {
    where: Object.keys(where).length > 0 ? where : undefined,
    order: [{ createdAt: 'desc' }],
    limit: 1000 // Максимально допустимый limit
  })

  // Дополнительная фильтрация на JS-уровне для уверенности
  let filteredSubmissions = allSubmissions
  if (mode === 'episodes') {
    filteredSubmissions = allSubmissions.filter((s) => s.episode?.id)
  } else if (mode === 'autowebinars') {
    filteredSubmissions = allSubmissions.filter((s) => s.autowebinar?.id)
  }

  const totalCount = filteredSubmissions.length
  const submissions = filteredSubmissions.slice(offset, offset + limit)

  const userIds = [...new Set(submissions.map((s) => s.user?.id).filter(Boolean))] as string[]
  let usersMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const users = await findUsersByIds(ctx, userIds)
    usersMap = Object.fromEntries(
      users.map((u) => [
        u.id,
        {
          id: u.id,
          displayName: u.displayName,
          firstName: u.firstName,
          lastName: u.lastName,
          confirmedEmail: u.confirmedEmail,
          confirmedPhone: u.confirmedPhone
        }
      ])
    )
  }

  const formIds = [...new Set(submissions.map((s) => s.form?.id).filter(Boolean))] as string[]
  let formsMap: Record<string, any> = {}
  if (formIds.length > 0) {
    const forms = await EpisodeForms.findAll(ctx, { where: { id: formIds }, limit: 200 })
    formsMap = Object.fromEntries(
      forms.map((f) => [f.id, { id: f.id, title: f.title, fields: f.fields }])
    )
  }

  const episodeIds = [...new Set(submissions.map((s) => s.episode?.id).filter(Boolean))] as string[]
  let episodesMap: Record<string, any> = {}
  if (episodeIds.length > 0) {
    const eps = await Episodes.findAll(ctx, { where: { id: episodeIds }, limit: 200 })
    episodesMap = Object.fromEntries(eps.map((e) => [e.id, { id: e.id, title: e.title }]))
  }

  const autowebinarIds = [
    ...new Set(submissions.map((s) => s.autowebinar?.id).filter(Boolean))
  ] as string[]
  let autowebinarsMap: Record<string, any> = {}
  if (autowebinarIds.length > 0) {
    const awebs = await Autowebinars.findAll(ctx, { where: { id: autowebinarIds }, limit: 200 })
    autowebinarsMap = Object.fromEntries(awebs.map((aw) => [aw.id, { id: aw.id, title: aw.title }]))
  }

  return {
    submissions: submissions.map((s) => ({
      id: s.id,
      formId: s.form?.id,
      episodeId: s.episode?.id,
      autowebinarId: s.autowebinar?.id,
      userId: s.user?.id,
      data: s.data,
      createdAt: s.createdAt
    })),
    formsMap,
    episodesMap,
    autowebinarsMap,
    usersMap,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit)
  }
})

// @shared-route
export const apiFormSubmissionsExportRoute = reporterApp.get(
  '/submissions-export',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const where: any = {}
    if (req.query.formId) where.form = req.query.formId
    if (req.query.episodeId) where.episode = req.query.episodeId
    if (req.query.autowebinarId) where.autowebinar = req.query.autowebinarId

    const mode = req.query.mode as string // 'episodes' | 'autowebinars'

    // Если mode задан, но нет явного фильтра по episode/autowebinar,
    // загружаем список ID для фильтрации на уровне запроса
    if (mode === 'autowebinars' && !where.autowebinar) {
      const allAws = await Autowebinars.findAll(ctx, { limit: 1000 })
      if (allAws.length > 0) {
        where.autowebinar = allAws.map((aw) => aw.id)
      } else {
        // Пустой CSV
        ctx.resp.setHeader('Content-Type', 'text/csv; charset=utf-8')
        ctx.resp.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"')
        return ''
      }
    } else if (mode === 'episodes' && !where.episode) {
      const allEps = await Episodes.findAll(ctx, { limit: 1000 })
      if (allEps.length > 0) {
        where.episode = allEps.map((ep) => ep.id)
      } else {
        // Пустой CSV
        ctx.resp.setHeader('Content-Type', 'text/csv; charset=utf-8')
        ctx.resp.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"')
        return ''
      }
    }

    const totalCount = await FormSubmissions.countBy(
      ctx,
      Object.keys(where).length > 0 ? where : undefined
    )

    const allSubmissionsQueries = Array.from({ length: Math.ceil(totalCount / 1000) }, (_, i) => {
      return FormSubmissions.findAll(ctx, {
        where: Object.keys(where).length > 0 ? where : undefined,
        order: [{ createdAt: 'desc' }],
        limit: 1000,
        offset: i * 1000
      })
    })

    const allSubmissionsPages = await Promise.all(allSubmissionsQueries)
    const allSubmissions = allSubmissionsPages.flat()

    // Фильтрация по mode
    let submissions = allSubmissions
    if (mode === 'episodes') {
      submissions = allSubmissions.filter((s) => s.episode?.id)
    } else if (mode === 'autowebinars') {
      submissions = allSubmissions.filter((s) => s.autowebinar?.id)
    }

    const userIds = [...new Set(submissions.map((s) => s.user?.id).filter(Boolean))] as string[]
    let usersMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const users = await findUsersByIds(ctx, userIds)
      usersMap = Object.fromEntries(users.map((u) => [u.id, u]))
    }

    const formIds = [...new Set(submissions.map((s) => s.form?.id).filter(Boolean))] as string[]
    let formsMap: Record<string, any> = {}
    if (formIds.length > 0) {
      const forms = await EpisodeForms.findAll(ctx, { where: { id: formIds }, limit: 200 })
      formsMap = Object.fromEntries(forms.map((f) => [f.id, f]))
    }

    const episodeIds = [
      ...new Set(submissions.map((s) => s.episode?.id).filter(Boolean))
    ] as string[]
    let episodesMap: Record<string, any> = {}
    if (episodeIds.length > 0) {
      const eps = await Episodes.findAll(ctx, { where: { id: episodeIds }, limit: 200 })
      episodesMap = Object.fromEntries(eps.map((e) => [e.id, e]))
    }

    const autowebinarIds = [
      ...new Set(submissions.map((s) => s.autowebinar?.id).filter(Boolean))
    ] as string[]
    let autowebinarsMap: Record<string, any> = {}
    if (autowebinarIds.length > 0) {
      const awebs = await Autowebinars.findAll(ctx, { where: { id: autowebinarIds }, limit: 200 })
      autowebinarsMap = Object.fromEntries(awebs.map((aw) => [aw.id, aw]))
    }

    // Собираем все ключи из data
    const allDataKeys = new Set<string>()
    submissions.forEach((s) => {
      if (s.data && typeof s.data === 'object') {
        Object.keys(s.data).forEach((k) => allDataKeys.add(k))
      }
    })
    const dataKeys = Array.from(allDataKeys)

    // Формируем данные для экспорта
    const exportData = submissions.map((s) => {
      const user = s.user?.id ? usersMap[s.user.id] : null
      const form = s.form?.id ? formsMap[s.form.id] : null
      const episode = s.episode?.id ? episodesMap[s.episode.id] : null
      const autowebinar = s.autowebinar?.id ? autowebinarsMap[s.autowebinar.id] : null
      const data = s.data || {}

      const row: Record<string, string> = {
        date: new Date(s.createdAt).toLocaleString('ru-RU'),
        form: form?.title || '',
        episode: episode?.title || autowebinar?.title || '',
        user: user?.displayName || '',
        email: user?.confirmedEmail || data.email || '',
        phone: user?.confirmedPhone || data.phone || ''
      }

      // Добавляем все поля из data
      dataKeys.forEach((k) => {
        row[k] = String(data[k] ?? '')
      })

      return row
    })

    // Добавляем заголовок в начало
    const header: Record<string, string> = {
      date: 'Дата',
      form: 'Форма',
      episode: 'Эфир/Автовебинар',
      user: 'Пользователь',
      email: 'Email',
      phone: 'Телефон'
    }
    dataKeys.forEach((k) => {
      header[k] = k
    })

    exportData.unshift(header)

    // Формируем CSV вручную с экранированием кавычек
    const allKeys = ['date', 'form', 'episode', 'user', 'email', 'phone', ...dataKeys]
    const csvString = exportData
      .map((row) => allKeys.map((key) => `"${(row[key] ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    return {
      statusCode: 200,
      rawHttpBody: csvString,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-disposition': `attachment;filename=submissions_${Date.now()}.csv`
      }
    }
  }
)

// @shared-route
export const apiFormSubmissionsCountRoute = reporterApp.get(
  '/submissions-count',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const counts: Record<string, number> = {}

    // Оптимизированный подсчёт: один запрос вместо N+1
    const countsResult = await FormSubmissions.select({
      formId: 'form',
      count: { $count: ['id'] }
    })
      .group(['formId'])
      .run(ctx)

    for (const row of countsResult) {
      counts[row.formId] = row.count
    }

    return counts
  }
)
