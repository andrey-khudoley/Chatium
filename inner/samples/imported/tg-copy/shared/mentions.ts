// @shared

/**
 * Cleans mention syntax from text for preview display
 * Converts @[Name](userId) to @Name, keeps @username as is
 */
export function cleanMentionsForPreview(text: string): string {
  if (!text) return ''
  
  // Replace @[Name](userId) with @Name
  // @username format stays as is
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
}

/**
 * Extracts mention data from text
 * Returns array of mentions with name and userId
 */
export function extractMentions(text: string): Array<{ name: string; userId: string }> {
  if (!text) return []
  
  const mentions: Array<{ name: string; userId: string }> = []
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      name: match[1],
      userId: match[2],
    })
  }
  
  return mentions
}
