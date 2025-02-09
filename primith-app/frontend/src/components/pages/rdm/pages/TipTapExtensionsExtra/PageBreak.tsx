import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

export interface PageBreakOptions {
  HTMLAttributes: Record<string, string>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Add a page break
       */
      setPageBreak: () => ReturnType;
    }
  }
}

const PageBreakComponent = () => (
  <NodeViewWrapper className="page-break-component">
    <div className="relative py-4">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-dashed border-gray-300"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="px-2 bg-white text-sm text-gray-500">
          Page Break
        </span>
      </div>
    </div>
  </NodeViewWrapper>
)

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      { tag: 'div.page-break-component' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
        class: 'page-break-component relative py-4' 
      }),
      [
        'div',
        { 
          class: 'absolute inset-0 flex items-center',
          'aria-hidden': 'true'
        },
        [
          'div',
          { class: 'w-full border-t border-dashed border-gray-300' }
        ]
      ],
      [
        'div',
        { class: 'relative flex justify-center' },
        [
          'span',
          { class: 'px-2 bg-white text-sm text-gray-500' },
          'Page Break'
        ]
      ]
    ]
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain()
          .insertContent({ type: this.name })
          .run()
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent)
  },
})