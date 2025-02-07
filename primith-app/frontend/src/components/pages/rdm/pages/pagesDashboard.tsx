import { useState } from 'react';
import { PageTree } from './pagesTree';
import { PageNode } from "@/types/pages";
import { PageEditor } from './pageEditor';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function PagesDashboard() {
    const [pages, setPages] = useState<PageNode[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    const handleCreatePage = (parentId: string | null, title: string) => {
      const newPage: PageNode = {
        id: crypto.randomUUID(),
        parentId,
        title,
        content: ''
      }
      setPages([...pages, newPage])
    }
  
    const handleDeletePage = (id: string) => {
      setPages(pages.filter(page => page.id !== id))
    }
  
    const handleRenamePage = (id: string, newTitle: string) => {
      setPages(pages.map(page => 
        page.id === id ? { ...page, title: newTitle } : page
      ))
    }
  
    const handleMovePage = (pageId: string, newParentId: string | null) => {
      setPages(pages.map(page =>
        page.id === pageId ? { ...page, parentId: newParentId } : page
      ))
    }
  
    const handleSavePage = (id: string, content: string) => {
      setPages(pages.map(page =>
        page.id === id ? { ...page, content } : page
      ))
    }

if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center max-w-[500px] space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome to Pages
          </h2>
          <p className="text-muted-foreground text-sm">
            No pages yet. Create your first page to get started.
          </p>
          <Button 
            onClick={() => handleCreatePage(null, "New Page")}
            className="px-6 py-2"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <PageTree
        pages={pages}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
        onMovePage={handleMovePage}
        onSelect={setSelectedPageId}
        selectedPageId={selectedPageId}
      />
      <div className="flex-1 p-8 flex items-center justify-center">
        {selectedPageId ? (
          <PageEditor
            page={pages.find(p => p.id === selectedPageId)!}
            onSave={handleSavePage}
          />
        ) : (
          <div className="text-center max-w-[500px] space-y-4">
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Select a page to edit
            </h3>
            <p className="text-muted-foreground">
              Choose a page from the sidebar or create a new one to get started.
            </p>
            <Button
              variant="outline"
              onClick={() => handleCreatePage(null, "New Page")}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Page
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}