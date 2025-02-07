import { useEditor, EditorContent } from '@tiptap/react';
import { PageNode } from "@/types/pages";


interface PageEditorProps {
    page: PageNode
    onSave: (id: string, content: string) => void
  }
  
  export function PageEditor({ page, onSave }: PageEditorProps) {
    const editor = useEditor({
      content: page.content || '<p>Start typing...</p>',
      onUpdate: ({ editor }) => {
        onSave(page.id, editor.getHTML())
      },
    })
  
    if (!editor) {
      return <div>Loading editor...</div>
    }
  
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">{page.title}</h2>
        <div className="border rounded-md p-4">
          <EditorContent editor={editor} />
        </div>
      </div>
    )
  }