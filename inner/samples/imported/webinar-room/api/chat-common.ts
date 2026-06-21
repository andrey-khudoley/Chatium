import { findFeedParticipants } from '@app/feed'
import { SmartUser } from '@app/auth'
import { ChatiumActions } from '@app/ui'
import ChatBans from '../tables/chat_bans.table'
import Episodes from '../tables/episodes.table'
import Autowebinars from '../tables/autowebinars.table'
import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import { ChatAccessMode, ChatBanType, EpisodeStatus, ScheduleStatus } from '../shared/enum'

export interface ChatTargetContext {
  episode: any
  isAutowebinar: boolean
  autowebinarId?: string
  autowebinarSchedule?: any
  chatAccessMode: ChatAccessMode
  isFinished: boolean
}

interface Author {
  id: string
  name: string
  avatar: {
    appIcon?: string
    iconCssClass?: string
    bgColor?: string
    color?: string
    image?: string
    imageSize?: number | any
    shape?: 'circle' | 'square'
    text?: string | number
  }
  getImageThumbnailUrl?: (size: number) => string
  onClick?: ChatiumActions
}

export async function checkUserBan(ctx: app.Ctx, userId: string, episodeId: string) {
  const now = new Date()

  const ban = await ChatBans.findOneBy(ctx, {
    user: userId,
    episode: episodeId
  })

  if (!ban) return null

  if (ban.type === 'timeout' && ban.expiresAt && new Date(ban.expiresAt) < now) {
    await ChatBans.delete(ctx, ban.id)
    return null
  }

  return ban
}

export async function ensureUserHaveAccessToFeed(ctx: app.Ctx, feed: any, user: any) {
  const [participant] = await findFeedParticipants(ctx, feed, {
    where: { userId: user.id },
    limit: 1
  })

  if (!participant) {
    throw new Error('У вас нет доступа к этому чату')
  }
}

export function mapAuthor(
  author: Author,
  currentUser: SmartUser,
  smartUsersMap: Map<string, SmartUser>
) {
  if (!author.avatar) author.avatar = {}

  const isCurrentUser = author.id === currentUser.id
  const smartUser = smartUsersMap.get(author.id)

  if (isCurrentUser) {
    author.name =
      smartUser?.firstName || smartUser?.lastName
        ? [smartUser?.firstName, smartUser?.lastName].filter(Boolean).join(' ')
        : 'Вы'

    author.avatar.image = currentUser.getImageThumbnailUrl
      ? currentUser.getImageThumbnailUrl(200)
      : undefined
  } else {
    author.name =
      smartUser?.firstName || smartUser?.lastName
        ? [smartUser?.firstName, smartUser?.lastName].filter(Boolean).join(' ')
        : 'Участник'

    if (smartUser?.hasImage && smartUser.getImageThumbnailUrl) {
      author.avatar.image = smartUser.getImageThumbnailUrl(200)
    }
  }

  author.avatar.bgColor = '#4726C3'
  author.onClick = undefined

  return author
}

export function mapMessage(
  msg: any,
  currentUser: SmartUser,
  smartUsersMap: Map<string, SmartUser>
) {
  msg.author = mapAuthor(msg.author, currentUser, smartUsersMap)

  if (msg.replyTo) {
    msg.replyTo.author = mapAuthor(msg.replyTo.author, currentUser, smartUsersMap)
  }

  return msg
}

export async function resolveChatTargetContext(
  ctx: app.Ctx,
  feedId: string
): Promise<ChatTargetContext> {
  const episode = await Episodes.findOneBy(ctx, { chatFeedId: feedId })

  if (episode) {
    return {
      episode,
      isAutowebinar: false,
      chatAccessMode: (episode.chatAccessMode as ChatAccessMode) || ChatAccessMode.Open,
      isFinished: episode.status === EpisodeStatus.Finished
    }
  }

  const schedule = await AutowebinarSchedules.findOneBy(ctx, { chatFeedId: feedId })
  if (!schedule) {
    throw new Error('Эфир или автовебинар для этого чата не найден')
  }

  const scheduleAutowebinarId = schedule.autowebinar?.id
  if (!scheduleAutowebinarId) throw new Error('Автовебинар в расписании не найден')

  const aw = await Autowebinars.findById(ctx, scheduleAutowebinarId)
  if (!aw) throw new Error('Автовебинар не найден')

  const nextChatAccessMode = aw.chatAccessMode as ChatAccessMode | undefined
  const chatAccessMode = Object.values(ChatAccessMode).includes(
    nextChatAccessMode as ChatAccessMode
  )
    ? (nextChatAccessMode as ChatAccessMode)
    : ChatAccessMode.Open

  return {
    episode: null,
    isAutowebinar: true,
    autowebinarId: aw.id,
    autowebinarSchedule: schedule,
    chatAccessMode,
    isFinished: schedule.status === ScheduleStatus.Finished
  }
}

export function buildBanErrorMessage(ban: any) {
  return ban.type === ChatBanType.Timeout && ban.expiresAt
    ? `Вы заблокированы в чате до ${new Date(ban.expiresAt).toLocaleString('ru')}`
    : 'Вы заблокированы в этом чате'
}
