/** Map a free-text label to a tag color class. */
export function tagClass(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('agent')) return 'ai'
  if (l.includes('approved') || l.includes('checks green') || l.includes('ready')) return 'ok'
  if (l.includes('changes requested') || l.includes('needs your call') || l === 'bug') return 'bad'
  if (l.includes('review')) return 'review'
  return ''
}
