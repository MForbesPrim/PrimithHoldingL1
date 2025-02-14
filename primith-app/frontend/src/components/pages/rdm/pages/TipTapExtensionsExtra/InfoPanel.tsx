import { Node } from '@tiptap/core'

export const InfoPanel = Node.create({
    name: 'infoPanel',
    group: 'block',
    content: 'block+',
    parseHTML() {
      return [{ tag: 'div[data-type="info-panel"]' }]
    },
    renderHTML() {
      return [
        'div',
        {
          'data-type': 'info-panel',
          class: [
            'bg-blue-50 border-l-4 border-blue-500',
            'min-h-8',
            'flex items-center',
            'px-4',
            'leading-none',
            'text-sm',
            'my-1',
            'rounded-r-md', // Add rounded corners on the right side
            '[&_p]:!my-0'
          ].join(' ')
        },
        0
      ]
    }
  })