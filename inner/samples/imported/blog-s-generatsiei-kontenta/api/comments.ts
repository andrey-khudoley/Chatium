// @shared
import CommentsTable from '../tables/comments.table'
import { requireRealUser, requireAccountRole } from '@app/auth'
import { findUsersByIds } from '@app/users'

// @shared-route
export const apiCommentsListRoute = app.get('/list/:postId', async (ctx, req) => {
  const comments = await CommentsTable.findAll(ctx, {
    where: {
      postId: req.params.postId
    },
    order: [{ createdAt: 'desc' }]
  })

  // Get unique user IDs
  const userIds = [...new Set(comments.map((comment) => comment.userId).filter(Boolean))]

  // Debug logging
  ctx.account.log('Debug comments', { userIds, commentsCount: comments.length })

  // Get user information
  const users = await findUsersByIds(ctx, userIds)
  ctx.account.log('Debug users', { users })
  const usersMap = new Map(users.map((user) => [user.id, user]))

  // Add user information to comments
  const commentsWithUsers = comments.map((comment) => ({
    ...comment,
    author: (() => {
      const user = usersMap.get(comment.userId)
      if (user) {
        return {
          ...user,
          displayName:
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.displayName || 'Пользователь'
        }
      }
      return { displayName: 'Пользователь' }
    })()
  }))

  return commentsWithUsers
})

// @shared-route
export const apiCommentsCreateRoute = app.post('/create', async (ctx, req) => {
  requireRealUser(ctx)

  const comment = await CommentsTable.create(ctx, {
    postId: req.body.postId,
    userId: ctx.user.id,
    content: req.body.content,
    authorName: ctx.user.displayName
  })

  // Return comment with author information
  return {
    ...comment,
    author: {
      id: ctx.user.id,
      displayName: ctx.user.displayName
    }
  }
})

// @shared-route
export const apiCommentsDeleteRoute = app.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await CommentsTable.delete(ctx, req.params.id)

  return { success: true }
})
