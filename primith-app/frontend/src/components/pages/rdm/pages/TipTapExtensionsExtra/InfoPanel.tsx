import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Info } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { Plugin } from 'prosemirror-state'

export interface InfoPanelOptions {
  HTMLAttributes: Record<string, any>
}

const InfoPanelView: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [localText, setLocalText] = useState(node.attrs.text || 'Info Panel Text')
    const inputRef = useRef<HTMLSpanElement>(null)
  
    const handleDoubleClick = () => {
        setIsEditing(true)
        // Use requestAnimationFrame to ensure the contentEditable state has updated
        requestAnimationFrame(() => {
          if (inputRef.current) {
            // Force contentEditable
            inputRef.current.setAttribute('contenteditable', 'true')
            inputRef.current.focus()
            
            // Set up selection
            const range = document.createRange()
            range.selectNodeContents(inputRef.current)
            const selection = window.getSelection()
            if (selection) {
              selection.removeAllRanges()
              selection.addRange(range)
            }
          }
        })
      }
  
    const handleBlur = () => {
      setIsEditing(false)
      updateAttributes({ text: localText })
    }
  
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        inputRef.current?.blur()
      }
      if (e.key === 'Escape') {
        setLocalText(node.attrs.text)
        setIsEditing(false)
      }
    }
  
    const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
        const newText = e.currentTarget.textContent || 'Info Panel Text'
        setLocalText(newText)
      
        // Get current cursor position
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const currentPos = range.startOffset
          
          // After state update, restore cursor to the same position
          requestAnimationFrame(() => {
            if (inputRef.current) {
              const newRange = document.createRange()
              newRange.setStart(inputRef.current.firstChild || inputRef.current, currentPos)
              newRange.collapse(true)
              selection.removeAllRanges()
              selection.addRange(newRange)
            }
          })
        }
      }
    
    return (
      <NodeViewWrapper className="react-component-info-panel inline-block w-[100%]">
        <div 
          className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 my-2 rounded-r-sm"
          contentEditable={false}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span
            ref={inputRef}
            className={`text-sm font-medium text-blue-800 whitespace-normal focus:outline-none ${
                isEditing ? 'border-b border-blue-300 outline-none min-w-[1em]' : ''
            }`}
            style={{
                whiteSpace: 'normal',
                wordBreak: 'normal',
                wordSpacing: 'normal',
                letterSpacing: 'normal'
            }}
            contentEditable={true}
            onDoubleClick={handleDoubleClick}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            suppressContentEditableWarning
            >
            {localText}
            </span>
          </div>
        </div>
      </NodeViewWrapper>
    );
};
  
export const InfoPanel = Node.create<InfoPanelOptions>({
    name: 'infoPanel',
    group: 'block',
    inline: false,
    atom: true,
    content: '',
    marks: '',
    defining: true,
    isolating: true,
    allowGapCursor: true,
  
    addOptions() {
      return {
        HTMLAttributes: {},
      }
    },
  
    addAttributes() {
      return {
        text: {
          default: 'Info',
          parseHTML: element => element.getAttribute('data-text') || 'Info',
          renderHTML: attributes => ({
            'data-text': attributes.text,
          }),
        },
      }
    },
  
    parseHTML() {
      return [
        {
          tag: 'div[data-type="info-panel"]',
          getAttrs: dom => ({
            text: (dom as HTMLElement).getAttribute('data-text') || 'Info Panel Text',
          }),
        },
      ]
    },
  
    renderHTML({ node, HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(
          { 'data-type': 'info-panel' },
          HTMLAttributes,
          {
            'data-text': node.attrs.text,
            class: 'bg-blue-50 border-l-4 border-blue-500 px-4 py-3 my-2 rounded-r-sm min-h-[60px]',
          }
        ),
        ['div', { class: 'flex items-center gap-2' },
          ['span', { class: 'info-icon' }],
          ['span', { class: 'text-sm font-medium text-blue-800' }, node.attrs.text]
        ]
      ]
    },
  
    addNodeView() {
      return ReactNodeViewRenderer(InfoPanelView)
    },
  
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleKeyDown: (view, event) => {
              if (event.key === 'Enter') {
                const { $from, $to } = view.state.selection
                const node = $from.node()
                
                if (node.type.name === 'infoPanel') {
                  const tr = view.state.tr.split($to.pos)
                  view.dispatch(tr)
                  return true
                }
              }
              return false
            }
          }
        })
      ]
    }
  })