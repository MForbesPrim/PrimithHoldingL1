import { Extension } from '@tiptap/core'
import { gapCursor } from 'prosemirror-gapcursor'

export const GapCursorExtension = Extension.create({
  name: 'gapCursorPlugin',
  addProseMirrorPlugins() {
    return [gapCursor()]
  },
})