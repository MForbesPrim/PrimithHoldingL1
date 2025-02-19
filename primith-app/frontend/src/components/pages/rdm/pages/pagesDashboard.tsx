import { useEffect, useState } from 'react';
import { PageTree } from './pagesTree';
import { PageNode, FolderNode } from "@/types/pages";
import PageEditor from './pageEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, PanelLeftClose, PanelLeftOpen, Folder, X } from 'lucide-react';
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
import { useNavigate, useLocation } from 'react-router-dom';

import { Switch } from '@/components/ui/switch';

export function PagesDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pages, setPages] = useState<PageNode[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folder: FolderNode | null }>({
    open: false,
    folder: null
  });
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
  const [folderHistory, setFolderHistory] = useState<string[]>([])

  const handleTemplatesClick = () => {
    navigate('/rdm/pages/templates');
    setShowTemplates(true);
    setSelectedPageId(null);
  };

  const handleCloseTemplates = () => {
    navigate('/rdm/pages');
    setShowTemplates(false);
  };

  useEffect(() => {
    if (selectedOrgId) {
      loadPages();
      loadFolders();
    }
  }, [selectedOrgId]);

  const handleBackClick = () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1];
      setFolderHistory(prev => prev.slice(0, -1));
      setCurrentFolderId(previousFolder);
    } else {
      setCurrentFolderId(null);
    }
  };

  useEffect(() => {
    // Set showTemplates based on URL path
    setShowTemplates(location.pathname === '/rdm/pages/templates');
  }, [location.pathname]);

  const handleCreateFolder = async (parentId: string | null = null) => {
    const organizationId = selectedOrgId;
    
    if (!organizationId) return;
  
    try {
      const newFolder = await pagesService.createFolder(
        newFolderName,
        parentId || currentFolderId, 
        organizationId
      );
      
      // Update folder history if creating a subfolder
      if (parentId || currentFolderId) {
        setFolderHistory(prev => [...prev, currentFolderId || '']);
      }
      
      // Update folders and reset dialog
      setFolders([...folders, newFolder]);
      setShowNewFolderDialog(false);
      setNewFolderName("");
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

const handleRenameFolder = async (folderId: string, newName: string) => {
  if (!selectedOrgId) return;
  try {
    await pagesService.updateFolder(
      folderId, 
      newName, 
      renameFolderDialog.folder?.parentId || null, 
      selectedOrgId
    );
    
    // Update local state
    setFolders(folders.map(folder => 
      folder.id === folderId ? { ...folder, name: newName } : folder
    ));
    
    // Close rename dialog
    setRenameFolderDialog({ open: false, folder: null });
  } catch (error) {
    console.error('Failed to rename folder:', error);
  }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!selectedOrgId) return;
    try {
      await pagesService.deleteFolder(folderId);
      
      // Update local state
      setFolders(folders.filter(folder => folder.id !== folderId));
      
      // Also remove or update any pages that were in this folder
      setPages(pages.filter(page => page.folderId !== folderId));
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const loadFolders = async () => {
    if (!selectedOrgId) return;
    try {
      const fetchedFolders = await pagesService.getFolders(selectedOrgId);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleFolderClick = (folderId: string) => {
    if (currentFolderId) {
      setFolderHistory(prev => [...prev, currentFolderId]);
    }
    setCurrentFolderId(folderId);
  };

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

    const dates = {
      monday_date: getDateOfWeekday(1),    // 1 = Monday
      tuesday_date: getDateOfWeekday(2),   // 2 = Tuesday
      wednesday_date: getDateOfWeekday(3), // 3 = Wednesday
      thursday_date: getDateOfWeekday(4),  // 4 = Thursday
      friday_date: getDateOfWeekday(5),    // 5 = Friday
    };

    function getDateOfWeekday(dayNum: number) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate how many days to subtract/add to get to the target day
      const diff = dayNum - currentDay;
      
      // Create a new date starting from the beginning of today
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      targetDate.setDate(targetDate.getDate() + diff);
      
      return targetDate.toISOString();
    }

    try {
      // Extract variables from template content using regex
      const variableRegex = /{{(\w+)}}/g;
      let contentToProcess = templateToUse.content;
      let matches = Array.from(contentToProcess.matchAll(variableRegex));
      
      // Create new page first
      const newPage = await pagesService.createPage(
        newTemplateName,
        null,
        selectedOrgId
      );
  
      // Process the content
      for (const match of matches) {
        const variableName = match[1];
        const fullMatch = match[0]; // The full {{variable}} string
  
        switch (variableName) {
          case 'monday_date':
          case 'tuesday_date':
          case 'wednesday_date':
          case 'thursday_date':
          case 'friday_date':
            contentToProcess = contentToProcess.replace(
              fullMatch,
              `<time data-type="date" datetime="${dates[variableName]}"></time>`
            );
            break;
          case 'date':
            // Default to current date for generic date variable
            contentToProcess = contentToProcess.replace(
              fullMatch,
              `<time data-type="date" datetime="${new Date().toISOString()}"></time>`
            );
            break;
          case 'startTime':
            contentToProcess = contentToProcess.replace(
              fullMatch,
              new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            );
            break;
          default:
            // Leave other variables empty
            contentToProcess = contentToProcess.replace(fullMatch, '');
            break;
        }
      }
  
      // Update the page with processed content
      await pagesService.updatePage(newPage.id, contentToProcess, selectedOrgId);
      
      // Update local state
      setPages(currentPages => [...currentPages, {
        ...newPage,
        content: contentToProcess
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
                  onClose={handleCloseTemplates}
                />
              ) : (
          // Show Pages Dashboard when no page is selected
          <div className="flex-1 p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    {currentFolderId ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleBackClick}
                          className="gap-2 border border-gray-300"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentFolderId(null);
                            setFolderHistory([]);
                          }}
                          className="gap-2 border border-gray-300"
                        >
                          Dashboard
                        </Button>
                      </>
                    ) : null}
                    <h1 className="text-2xl font-bold ml-2">Pages</h1>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      onClick={handleTemplatesClick}
                      className="px-4 mr-4"
                    >
                      Templates
                    </Button>
                    <Button
                      onClick={() => setShowNewFolderDialog(true)}
                      className="px-4 mr-4"
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Create Folder
                    </Button>
                    <Button
                      onClick={() => handleCreatePageClick(null)}
                      className="px-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Page
                    </Button>
                  </div>
                </div>
                <PagesTable
                  pages={pages}
                  folders={folders}
                  onFolderClick={handleFolderClick}
                  currentFolderId={currentFolderId}
                  onPageClick={setSelectedPageId}
                  onCreatePage={handleCreatePageClick}
                  onDeletePage={handleDeletePage}
                  onRenamePage={handleRenamePage}
                  onCreateFolder={(parentId) => {
                    setNewFolderName("");
                    setShowNewFolderDialog(true);
                    if (parentId) {
                      setCurrentFolderId(parentId);
                    }
                  }}
                  onRenameFolder={(id, name) => {
                    setNewFolderName(name);
                    setRenameFolderDialog({ 
                      open: true, 
                      folder: (folders ?? []).find(f => f.id === id) || null 
                    });
                  }}
                  onDeleteFolder={handleDeleteFolder}
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
      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewFolderDialog(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault(); // Prevent default form submission
                handleCreateFolder(); // Call without parameters
              }}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog 
        open={renameFolderDialog.open} 
        onOpenChange={(open) => setRenameFolderDialog({ open, folder: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter new folder name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameFolderDialog({ open: false, folder: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameFolderDialog.folder) {
                  handleRenameFolder(renameFolderDialog.folder.id, newFolderName);
                }
              }}
              disabled={!newFolderName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
