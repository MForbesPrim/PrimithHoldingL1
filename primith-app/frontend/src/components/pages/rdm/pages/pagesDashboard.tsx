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
import { Input } from '@/components/ui/input';
import { PagesService } from '@/services/pagesService';
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";
import { PagesTable } from './pagesTable';
import { Templates } from './pageTemplates';

import { Switch } from '@/components/ui/switch';

export function PagesDashboard() {
  const [pages, setPages] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
  const [isPageTreeVisible, setIsPageTreeVisible] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [showTemplateNameDialog, setShowTemplateNameDialog] = useState(false);
  const [templateToUse, setTemplateToUse] = useState<PageNode | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const { selectedOrgId } = useOrganization();
  const pagesService = new PagesService();

  const handleTemplatesClick = () => {
    setShowTemplates(true);
    setSelectedPageId(null);
  };

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

  const handleUseTemplate = (template: PageNode) => {
    setTemplateToUse(template);
    setNewTemplateName(template.title); // Pre-fill with template name
    setShowTemplateNameDialog(true);
  };
  
  const handleConfirmTemplateUse = async () => {
    if (!templateToUse || !selectedOrgId) return;
  
    try {
      // Extract variables from template content using regex
      const variableRegex = /{{(\w+)}}/g;
      let processedContent = templateToUse.content;
      const matches = templateToUse.content.matchAll(variableRegex);
  
      for (const match of matches) {
        const variableName = match[1]; // Get the variable name without {{ }}
        let replacement = '';
  
        // Handle specific variables with auto-population
        switch (variableName) {
          case 'date':
            replacement = new Date().toLocaleDateString();
            break;
          case 'startTime':
            replacement = new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            break;
          default:
            // Leave other variables empty
            replacement = '';
            break;
        }
  
        processedContent = processedContent.replace(`{{${variableName}}}`, replacement);
      }
  
      // Create the new page with the confirmed name
      const newPage = await pagesService.createPage(
        newTemplateName,
        null,
        selectedOrgId
      );
  
      // Update the content with the processed template content
      await pagesService.updatePage(newPage.id, processedContent, selectedOrgId);
      
      // Update local state
      setPages(currentPages => [...currentPages, {
        ...newPage,
        content: processedContent
      }]);
      
      // Reset dialog state
      setShowTemplateNameDialog(false);
      setTemplateToUse(null);
      setNewTemplateName("");
      
      // Show the new page
      setSelectedPageId(newPage.id);
      setShowTemplates(false);
    } catch (error) {
      console.error('Failed to create page from template:', error);
    }
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
    
    // Get all child pages recursively
    const getChildPages = (pageId: string): string[] => {
      const children = pages
        .filter(page => page.parentId === pageId)
        .map(page => page.id);
      
      return children.concat(
        children.flatMap(childId => getChildPages(childId))
      );
    };
  
    const childPages = getChildPages(id);
    console.log('Deleting page and children:', [id, ...childPages]);
  
    try {
      // Delete children first
      for (const childId of childPages) {
        await pagesService.deletePage(childId, selectedOrgId);
      }
      // Then delete the parent
      await pagesService.deletePage(id, selectedOrgId);
      
      // Update state to remove all deleted pages
      setPages(prevPages => 
        prevPages.filter(page => 
          !childPages.includes(page.id) && page.id !== id
        )
      );
    } catch (error) {
      console.error('Delete operation failed:', error);
      throw error;
    }
  };

  const handleRenamePage = async (id: string, newTitle: string) => {
    if (!selectedOrgId) return;
    try {
      await pagesService.renamePage(id, newTitle, selectedOrgId);
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
        <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-900 border-t-transparent" />
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
                <div className="flex items-center gap-2">
                  <span className="text-sm">Auto-Save</span>
                  <Switch
                    checked={autoSaveEnabled}
                    onCheckedChange={(checked) => {
                      setAutoSaveEnabled(checked);
                      console.log('Auto-save enabled:', checked);
                    }}
                  />
                </div>
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
              autoSave={autoSaveEnabled}
            />
          </div>
               ) : showTemplates ? (
                <Templates 
                organizationId={selectedOrgId} 
                onCreatePage={handleUseTemplate}
                onClose={() => setShowTemplates(false)}
              />
              ) : (
          // Show Pages Dashboard when no page is selected
          <div className="mx-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Pages</h1>
              <div className="flex justify-between items-center mb-4">
              <Button
                onClick={handleTemplatesClick}
                className="px-4 mr-4"
              >
                Templates
              </Button>
              <Button
                onClick={() => handleCreatePageClick(null)}
                className="px-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </Button>
              </div>
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

      {/* Template Name Dialog */}
      <Dialog open={showTemplateNameDialog} onOpenChange={setShowTemplateNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Page from Template</DialogTitle>
            <DialogDescription>
              Enter a name for your new page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Enter page name"
              autoFocus
              className="!text-[15px]"
            />
            </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateNameDialog(false);
                setTemplateToUse(null);
                setNewTemplateName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTemplateUse}
              disabled={!newTemplateName.trim()}
            >
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
