import { useEffect, useState } from 'react';
import { PageTree } from './pagesTree';
import { PageNode } from "@/types/pages";
import PageEditor from './pageEditor';
import { Button } from '@/components/ui/button';
import { Plus, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PagesService } from '@/services/pagesService';
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"
import { PagesTable } from './pagesTable';

export function PagesDashboard() {
    const [pages, setPages] = useState<PageNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [showNewPageDialog, setShowNewPageDialog] = useState(false);
    const [newPageName, setNewPageName] = useState("");
    const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
    const [isPageTreeVisible, setIsPageTreeVisible] = useState(false);

    const { selectedOrgId } = useOrganization();
    const pagesService = new PagesService();

    useEffect(() => {
      if (selectedOrgId) {
          loadPages();
      }
    }, [selectedOrgId]);

    const loadPages = async () => {
      if (!selectedOrgId) return;
      try {
          setLoading(true);
          const fetchedPages = await pagesService.getPages(selectedOrgId);
          console.log('Fetched pages in Dashboard:', fetchedPages); // Debug log
          setPages(fetchedPages);
      } catch (error) {
          console.error('Failed to load pages:', error);
      } finally {
          setLoading(false);
      }
  };

    const handleCreatePageClick = (parentId: string | null) => {
        setNewPageParentId(parentId);
        setNewPageName("");
        setShowNewPageDialog(true);
    };

    const handleCreatePage = async (parentId: string | null, title: string) => {
      if (!selectedOrgId) return;
      try {
          const newPage = await pagesService.createPage(title, parentId, selectedOrgId);
          setPages(currentPages => [...currentPages, newPage]);
          setShowNewPageDialog(false);
          setNewPageName("");
          // Select the new page to open it in the editor
          setSelectedPageId(newPage.id);
      } catch (error) {
          console.error('Failed to create page:', error);
      }
    };

    const handleDeletePage = async (id: string) => {
      if (!selectedOrgId) return;
      try {
        // Call the backend API to delete the page.
        await pagesService.deletePage(id, selectedOrgId);
        
        // Update the local state to remove the deleted page.
        setPages(pages.filter((page) => page.id !== id));
      } catch (error) {
        console.error('Failed to delete page:', error);
      }
    };
  
    const handleRenamePage = async (id: string, newTitle: string) => {
      if (!selectedOrgId) return;
      try {
        // Call the backend API to rename the page.
        await pagesService.renamePage(id, newTitle, selectedOrgId);
        
        // Update the local state to reflect the new title.
        setPages(
          pages.map((page) =>
            page.id === id ? { ...page, title: newTitle } : page
          )
        );
      } catch (error) {
        console.error('Failed to rename page:', error);
      }
    };

    const handleMovePage = (pageId: string, newParentId: string | null) => {
        setPages(
            pages.map((page) =>
                page.id === pageId ? { ...page, parentId: newParentId } : page
            )
        );
    };
  
    const handleSavePage = async (id: string, content: string) => {
        if (!selectedOrgId) return;
        try {
            await pagesService.updatePage(id, content, selectedOrgId);
            setPages(pages.map(page =>
                page.id === id ? { ...page, content } : page
            ));
        } catch (error) {
            console.error('Failed to save page:', error);
        }
    };

    if (loading) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-900 border-t-transparent"/>
          </div>
        );
    }
  
    return (
      <div className="flex h-full">
          {/* Show PageTree only when a page is selected */}
          {selectedPageId && isPageTreeVisible && (
              <PageTree
                  pages={pages}
                  onCreatePage={handleCreatePageClick}
                  onDeletePage={handleDeletePage}
                  onRenamePage={handleRenamePage}
                  onMovePage={handleMovePage}
                  onSelect={setSelectedPageId}
                  selectedPageId={selectedPageId}
              />
          )}
          
          <div className="flex-1 p-4">
              {selectedPageId ? (
                  // Show Page Editor when a page is selected
                  <div>
                      <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setIsPageTreeVisible(!isPageTreeVisible)}
                                  className="mr-2"
                              >
                                  {isPageTreeVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
                              </Button>
                          </div>
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPageId(null)}
                          >
                              <X className="h-4 w-4 mr-2" />
                              Close
                          </Button>
                      </div>
                      <PageEditor
                          page={pages.find(p => p.id === selectedPageId)!}
                          onSave={handleSavePage}
                          onRename={handleRenamePage}
                      />
                  </div>
              ) : (
                  // Show Pages Dashboard when no page is selected
                  <div className="mx-4">
                      <div className="flex justify-between items-center mb-4">
                          <h1 className="text-2xl font-bold">Pages</h1>
                          <Button
                              onClick={() => handleCreatePageClick(null)}
                              className="px-4"
                          >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Page
                          </Button>
                      </div>
                      <PagesTable 
                          pages={pages}
                          onPageClick={setSelectedPageId}
                          onCreatePage={handleCreatePageClick}
                          onDeletePage={handleDeletePage}
                          onRenamePage={handleRenamePage}
                      />
                  </div>
              )}
          </div>

          {/* New Page Dialog */}
          <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Page</DialogTitle>
                        <DialogDescription>
                            Enter a name for the new page.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newPageName}
                            onChange={(e) => setNewPageName(e.target.value)}
                            placeholder="Enter page name"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowNewPageDialog(false);
                                setNewPageName("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (newPageName.trim()) {
                                    handleCreatePage(newPageParentId, newPageName.trim());
                                }
                            }}
                        >
                            Create Page
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}