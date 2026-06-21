import { findFeedParticipants } from '@app/feed'

export type ChatRole = 'owner' | 'admin' | 'guest'

export interface PermissionCheckResult {
  hasPermission: boolean
  participantRole: ChatRole | null
  isOwner: boolean
  isWorkspaceAdmin: boolean
}

/**
 * Проверяет права пользователя в чате
 * @param ctx - контекст
 * @param feedId - ID чата
 * @param userId - ID пользователя
 * @param requiredRole - минимально требуемая роль ('guest' | 'admin' | 'owner')
 * @returns PermissionCheckResult
 */
export async function checkChatPermission(
  ctx: any,
  feedId: string,
  userId: string,
  requiredRole: ChatRole = 'guest'
): Promise<PermissionCheckResult> {
  const participants = await findFeedParticipants(ctx, feedId)
  
  // DEBUG: логируем для диагностики
  // console.log('[DEBUG checkChatPermission] feedId:', feedId, 'userId:', userId, 'requiredRole:', requiredRole)
  // console.log('[DEBUG checkChatPermission] participants count:', participants.length)
  // console.log('[DEBUG checkChatPermission] participants userIds:', participants.map(p => ({ userId: p.userId, role: p.role })))
  
  const participant = participants.find((p) => p.userId === userId)
  
  // console.log('[DEBUG checkChatPermission] found participant:', participant ? { userId: participant.userId, role: participant.role } : null)
  
  // Проверяем, является ли пользователь администратором воркспейса
  const isWorkspaceAdmin = ctx.user?.is('Admin') || ctx.user?.is('Owner') || false
  
  if (!participant) {
    // console.log('[DEBUG checkChatPermission] participant not found, returning no permission')
    return {
      hasPermission: false,
      participantRole: null,
      isOwner: false,
      isWorkspaceAdmin,
    }
  }
  
  const role = (participant.role as ChatRole) || 'guest'
  const isOwner = role === 'owner'
  
  // Иерархия ролей: owner > admin > guest
  const roleHierarchy: Record<ChatRole, number> = {
    owner: 3,
    admin: 2,
    guest: 1,
  }
  
  const hasPermission = roleHierarchy[role] >= roleHierarchy[requiredRole]
  
  // console.log('[DEBUG checkChatPermission] role:', role, 'requiredRole:', requiredRole, 'hasPermission:', hasPermission, 'isWorkspaceAdmin:', isWorkspaceAdmin)
  
  return {
    hasPermission,
    participantRole: role,
    isOwner,
    isWorkspaceAdmin,
  }
}

/**
 * Проверяет, может ли пользователь управлять чатом (admin или owner)
 * Для публичных чатов также проверяет, является ли пользователь администратором воркспейса
 */
export async function canManageChat(
  ctx: any,
  feedId: string,
  userId: string,
  isPublic: boolean = false
): Promise<boolean> {
  // console.log('[DEBUG canManageChat] feedId:', feedId, 'userId:', userId, 'isPublic:', isPublic)
  
  const { hasPermission, isWorkspaceAdmin, participantRole } = await checkChatPermission(ctx, feedId, userId, 'admin')
  
  // console.log('[DEBUG canManageChat] result:', { hasPermission, isWorkspaceAdmin, participantRole })
  
  // Администраторы воркспейса могут управлять публичными чатами
  if (isPublic && isWorkspaceAdmin) {
    // console.log('[DEBUG canManageChat] allowing via workspace admin for public chat')
    return true
  }
  
  // console.log('[DEBUG canManageChat] final result:', hasPermission)
  return hasPermission
}

/**
 * Проверяет, является ли пользователь владельцем чата
 * Для публичных чатов также проверяет, является ли пользователь администратором воркспейса
 */
export async function isChatOwner(
  ctx: any,
  feedId: string,
  userId: string,
  isPublic: boolean = false
): Promise<boolean> {
  const { isOwner, isWorkspaceAdmin } = await checkChatPermission(ctx, feedId, userId, 'owner')
  // Администраторы воркспейса имеют права владельца для публичных чатов
  if (isPublic && isWorkspaceAdmin) return true
  return isOwner
}