import { Node } from '@tiptap/core'
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewProps,
  NodeViewContent,
} from '@tiptap/react'
import React, { useRef, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

export interface ExpandOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    expand: {
      setExpand: () => ReturnType
    }
  }
}

const ExpandNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
    const [isOpen, setIsOpen] = useState(node.attrs.isOpen)
  
    // NEW: Local state for typing
    const [localTitle, setLocalTitle] = useState(node.attrs.title)
  
    const titleRef = useRef<HTMLDivElement>(null)
  
    const toggleOpen = (e: React.MouseEvent) => {
      e.stopPropagation()
      const newIsOpen = !isOpen
      setIsOpen(newIsOpen)
      updateAttributes({ isOpen: newIsOpen })
    }
  
    const handleDoubleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (titleRef.current) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(titleRef.current)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  
    // NEW: Just update local state on every keystroke
    const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
      setLocalTitle(e.currentTarget.textContent || 'Click to expand')
    }
  
    // NEW: Sync to node.attrs only on blur (or on Enter)
    const handleBlur = () => {
      updateAttributes({ title: localTitle })
    }
  
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        // Optionally save on Enter as well
        updateAttributes({ title: localTitle })
        titleRef.current?.blur()
      }
    }
  
    return (
      <NodeViewWrapper className="my-4">
        <div className="border rounded-lg">
          <div
            className="flex items-center gap-2 p-3 hover:bg-gray-50"
            contentEditable={false}
          >
            <div onClick={toggleOpen} className="cursor-pointer flex-shrink-0">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
  
            <div
              ref={titleRef}
              className="flex-grow cursor-text font-medium text-gray-700 outline-none select-text text-sm"
              contentEditable="plaintext-only"
              onDoubleClick={handleDoubleClick}
              onInput={handleTitleInput}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              suppressContentEditableWarning
              onPaste={(e) => {
                e.preventDefault()
                const text = e.clipboardData.getData('text/plain')
                document.execCommand('insertText', false, text)
              }}
            >
              {localTitle} {/* RENDER LOCAL STATE, not node.attrs.title */}
            </div>
          </div>
  
          {isOpen && (
            <div className="transition-all duration-200 block">
              <NodeViewContent className="p-4 border-t prose max-w-none min-h-[60px] text-sm" />
            </div>
          )}
        </div>
      </NodeViewWrapper>
    )
  }
  
  export const Expand = Node.create<ExpandOptions>({
    name: 'expand',
    group: 'block',
    content: 'block+',
    defining: true,
    isolating: true,
    draggable: true,
  
    addOptions() {
      return {
        HTMLAttributes: {},
      }
    },
  
    addAttributes() {
      return {
        title: {
          default: 'Click to expand',
          parseHTML: element => element.getAttribute('data-title'),
          renderHTML: attributes => ({
            'data-title': attributes.title,
          }),
        },
        isOpen: {
          default: true,
          parseHTML: element => element.getAttribute('data-is-open') === 'true',
          renderHTML: attributes => ({
            'data-is-open': attributes.isOpen,
          }),
        },
      }
    },
  
    parseHTML() {
      return [{ tag: 'div[data-type="expand"]' }]
    },
  
    renderHTML({ HTMLAttributes }) {
      return ['div', { 'data-type': 'expand', ...HTMLAttributes }, 0]
    },
  
    addNodeView() {
      return ReactNodeViewRenderer(ExpandNodeView)
    },
  })