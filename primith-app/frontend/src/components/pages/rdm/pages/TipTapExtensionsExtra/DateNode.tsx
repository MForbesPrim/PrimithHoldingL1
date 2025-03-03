import { Node, mergeAttributes } from '@tiptap/core'
import { Command } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { format } from 'date-fns'
import React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover-datenode"
import { Calendar } from "@/components/ui/calendar"

export interface DateNodeOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dateNode: {
      setDate: (datetime: string) => ReturnType
    }
  }
}

const DateNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes }) => { 
    const date = node.attrs.datetime ? new Date(node.attrs.datetime) : new Date()
  
    return (
      <NodeViewWrapper className="react-component-date-node inline-block my-2"> {/* Added inline-block */}
        <Popover>
          <PopoverTrigger asChild>
            <button 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
              contentEditable={false}
            >
              <CalendarIcon className="w-3 h-3" />
              {format(date, 'MMM dd, yyyy')}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  updateAttributes({ datetime: newDate.toISOString() })
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </NodeViewWrapper>
    );
  };

export const DateNode = Node.create<DateNodeOptions>({
  name: 'dateNode',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      datetime: {
        default: new Date().toISOString(),
        parseHTML: element => element.getAttribute('datetime'),
        renderHTML: attributes => {
          return {
            datetime: attributes.datetime,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'time[data-type="date"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const date = new Date(node.attrs.datetime)
    return ['time', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        'data-type': 'date',
        datetime: node.attrs.datetime,
      }
    ), format(date, 'MMM dd, yyyy')]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateNodeView)
  },

  addCommands() {
    return {
      setDate: (datetime: string): Command => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { datetime }
        })
      },
    }
  },
})