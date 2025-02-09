import { Extension } from '@tiptap/core';
import { Command } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['listItem', 'paragraph'],
      minIndent: 0,
      maxIndent: 8,
      indentLevel: 2,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const indent = element.style.marginLeft;
              return indent ? parseInt(indent) / 24 : 0;
            },
            renderHTML: attributes => {
              if (attributes.indent === 0) return {};
              return {
                style: `margin-left: ${attributes.indent * 24}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent: (): Command => ({ tr, state, dispatch }) => {
        const { selection } = state;
        
        let changed = false;
        
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = (node.attrs.indent || 0) + 1;
            if (indent <= this.options.maxIndent) {
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent,
                });
              }
              changed = true;
            }
          }
        });

        return changed;
      },
      outdent: (): Command => ({ tr, state, dispatch }) => {
        const { selection } = state;
        
        let changed = false;
        
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = Math.max((node.attrs.indent || 0) - 1, 0);
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent,
              });
            }
            changed = true;
          }
        });

        return changed;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    };
  },
});