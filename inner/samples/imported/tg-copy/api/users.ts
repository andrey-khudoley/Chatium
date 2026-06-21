import { requireRealUser, findUsers, findUserById, findUsersByIds, findIdentities, normalizeIdentityKey } from '@app/auth'

export const apiUsersSearchRoute = app
  .body((s) => ({
    query: s.string(),
    type: s.string().optional(),
  }))
  .post('/search', async (ctx, req) => {
    requireRealUser(ctx)

    const { query, type } = req.body
    const searchResults = []

    if (!type || type === 'username') {
      const usersByUsername = await findUsers(ctx, {
        where: { 
          username: query,
          type: 'Real',
        },
        limit: 10,
      })
      searchResults.push(...usersByUsername.map(u => ({
        id: u.id,
        displayName: u.displayName,
        username: u.username,
        type: 'username',
        avatar: u.imageUrl,
      })))
    }

    if (!type || type === 'email') {
      const normalizedEmail = normalizeIdentityKey('Email', query)
      const identities = await findIdentities(ctx, {
        where: {
          type: 'Email',
          key: normalizedEmail,
        },
        limit: 10,
      })
      
      for (const identity of identities) {
        const user = await findUserById(ctx, identity.userId)
        if (user && user.type === 'Real') {
          searchResults.push({
            id: user.id,
            displayName: user.displayName,
            email: query,
            type: 'email',
            avatar: user.imageUrl,
          })
        }
      }
      
      // Fallback: ищем по точному совпадению email без нормализации (case-insensitive)
      if (identities.length === 0 && query.includes('@')) {
        const allEmailIdentities = await findIdentities(ctx, {
          where: {
            type: 'Email',
          },
          limit: 1000,
        })
        
        const queryLower = query.toLowerCase().trim()
        const matchedIdentity = allEmailIdentities.find(
          identity => identity.key.toLowerCase().trim() === queryLower
        )
        
        if (matchedIdentity) {
          const user = await findUserById(ctx, matchedIdentity.userId)
          if (user && user.type === 'Real' && !searchResults.find(r => r.id === user.id)) {
            searchResults.push({
              id: user.id,
              displayName: user.displayName,
              email: matchedIdentity.key,
              type: 'email',
              avatar: user.imageUrl,
            })
          }
        }
      }
    }

    if (!type || type === 'phone') {
      const normalizedPhone = normalizeIdentityKey('Phone', query)
      const identities = await findIdentities(ctx, {
        where: {
          type: 'Phone',
          key: normalizedPhone,
        },
        limit: 10,
      })
      
      for (const identity of identities) {
        const user = await findUserById(ctx, identity.userId)
        if (user && user.type === 'Real') {
          searchResults.push({
            id: user.id,
            displayName: user.displayName,
            phone: query,
            type: 'phone',
            avatar: user.imageUrl,
          })
        }
      }
    }

    const uniqueResults = searchResults.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    )

    return {
      users: uniqueResults,
    }
  })

export const apiUsersFindByIdentityRoute = app
  .body((s) => ({
    email: s.string().optional(),
    phone: s.string().optional(),
    username: s.string().optional(),
  }))
  .post('/find-by-identity', async (ctx, req) => {
    requireRealUser(ctx)

    const { email, phone, username } = req.body

    if (username) {
      const users = await findUsers(ctx, {
        where: { 
          username,
          type: 'Real',
        },
        limit: 1,
      })
      if (users.length > 0) {
        return { user: users[0] }
      }
    }

    if (email) {
      const normalizedEmail = normalizeIdentityKey('Email', email)
      let identities = await findIdentities(ctx, {
        where: {
          type: 'Email',
          key: normalizedEmail,
        },
        limit: 1,
      })
      
      // Fallback: ищем по точному совпадению без нормализации (case-insensitive)
      if (identities.length === 0) {
        const allEmailIdentities = await findIdentities(ctx, {
          where: {
            type: 'Email',
          },
          limit: 1000,
        })
        
        const emailLower = email.toLowerCase().trim()
        const matchedIdentity = allEmailIdentities.find(
          identity => identity.key.toLowerCase().trim() === emailLower
        )
        
        if (matchedIdentity) {
          identities = [matchedIdentity]
        }
      }
      
      if (identities.length > 0) {
        const user = await findUserById(ctx, identities[0].userId)
        if (user && user.type === 'Real') {
          return { user }
        }
      }
    }

    if (phone) {
      const normalizedPhone = normalizeIdentityKey('Phone', phone)
      const identities = await findIdentities(ctx, {
        where: {
          type: 'Phone',
          key: normalizedPhone,
        },
        limit: 1,
      })
      if (identities.length > 0) {
        const user = await findUserById(ctx, identities[0].userId)
        if (user && user.type === 'Real') {
          return { user }
        }
      }
    }

    return { user: null }
  })

export const apiUsersGetByIdsRoute = app
  .body((s) => ({
    ids: s.array(s.string()),
  }))
  .post('/get-by-ids', async (ctx, req) => {
    requireRealUser(ctx)

    const { ids } = req.body
    
    if (!ids || ids.length === 0) {
      return { users: [] }
    }

    // Убираем дубликаты
    const uniqueIds = [...new Set(ids)]
    
    const users = await findUsersByIds(ctx, uniqueIds)
    
    // Получаем identity для каждого пользователя
    const usersWithContacts = await Promise.all(
      users.map(async (user) => {
        const identities = await findIdentities(ctx, {
          where: { userId: user.id },
          limit: 10,
        })
        
        const emailIdentity = identities.find(i => i.type === 'Email')
        const phoneIdentity = identities.find(i => i.type === 'Phone')
        
        return {
          id: user.id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.imageUrl,
          email: emailIdentity?.key || null,
          phone: phoneIdentity?.key || null,
        }
      })
    )

    return { users: usersWithContacts }
  })
