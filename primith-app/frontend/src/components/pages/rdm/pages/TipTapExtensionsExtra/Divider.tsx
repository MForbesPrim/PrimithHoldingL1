import { Node } from '@tiptap/core'

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  parseHTML() {
    return [{ tag: 'hr' }]
  },
  renderHTML() {
    return ['hr', { class: 'my-2 border-t border-[--border]' }] 
  },
})