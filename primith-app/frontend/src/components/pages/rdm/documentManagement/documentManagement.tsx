import { useEffect, useState } from "react"
import { DocumentMetadata, FolderNode, FolderMetadata } from "@/types/document"
import { DocumentService } from "@/services/documentService"
import AuthService from '@/services/auth';
import { Button } from "@/components/ui/button"
import { FolderTree } from "@/components/pages/rdm/documentManagement/folderTree"
import { FoldersTable } from "@/components/pages/rdm/documentManagement/foldersTable"
import { DocumentsOverview } from "@/components/pages/rdm/documentManagement/documentsOverview"
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { DashboardTable } from "@/components/pages/rdm/documentManagement/dmDashboardTable"
import { DocumentsTable } from "@/components/pages/rdm/documentManagement/documentsTable"
import { FolderContentsTable } from "@/components/pages/rdm/documentManagement/folderContentsTable"
import { TrashView } from '@/components/pages/rdm/documentManagement/dmTrashView';
import { useCallback } from 'react';
import { useProject } from '@/components/pages/rdm/context/projectContext';
import { useToast } from "@/hooks/use-toast";

export function DocumentManagement() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [folderMetadata, setFolderMetadata] = useState<FolderMetadata[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"dashboard" | "documents" | "folders" | "trash" | "folderContents" | "overview">("dashboard");
  const [_isUploading, _setIsUploading] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const [hasWritePermission, setHasWritePermission] = useState(false); 
  const [folderHistory, setFolderHistory] = useState<string[]>([])
  const { selectedProjectId } = useProject();
  const { toast } = useToast();
  const { selectedOrgId } = useOrganization()
  const documentService = new DocumentService()

  useEffect(() => {
    if (!selectedOrgId) {
      setFolders([])
      setDocuments([])
      setFolderMetadata([])
      setSelectedFolderId(null)
      setFolderHistory([])
      return
    }
    loadFolderData(selectedOrgId)
    loadDocuments(selectedOrgId, null)
    checkWritePermissions()
  }, [selectedOrgId, selectedProjectId])

  useEffect(() => {
    if (selectedOrgId && selectedFolderId) {
      loadDocuments(selectedOrgId, selectedFolderId)
    }
  }, [selectedFolderId])

  useEffect(() => {
    if (viewMode === "trash" && !hasWritePermission) {
      setViewMode("dashboard");
    }
  }, [viewMode, hasWritePermission]);

  const checkWritePermissions = async () => {
    try {
      // Get current user and membership type from AuthService
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.user?.id) {
        setHasWritePermission(false);
        return;
      }
      
      // Get the user's membership type
      const membershipType = await AuthService.getMembershipType();
      
      // For internal users (membershipType === false), allow write permissions
      if (membershipType === false) {
        setHasWritePermission(true);
      } else {
        // For external users, be more restrictive
        setHasWritePermission(false);
      }
    } catch (error) {
      console.error("Failed to check document permissions:", error);
      setHasWritePermission(false);
    }
  };

  async function loadFolderData(orgId: string) {
    try {
      const folderData = await documentService.getFolders(orgId)
      console.log('Raw folder data:', folderData)
      setFolders(folderData ?? [])

      const metadata = (folderData ?? []).map(folder => {
        const folderMetadata = {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          fileCount: folder.fileCount,
          updatedAt: new Date(folder.updatedAt).toISOString(),
          lastUpdatedBy: folder.lastUpdatedBy
        }
        console.log('Processing folder:', folderMetadata)
        return folderMetadata
      })

      console.log('Final folderMetadata:', metadata)
      setFolderMetadata(metadata)
    } catch (error) {
      console.error("Failed to load folder data:", error)
    }
  }

  async function loadDocuments(orgId: string, folderId: string | null, projectId: string | null = null) {
    try {
      const docs = await documentService.getDocuments(folderId, orgId, projectId);
      setDocuments(docs ?? []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      setDocuments([]);
    }
  }

  async function handleAssociateWithProject(documentId: string) {
    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
        duration: 5000
      });
      return;
    }
    try {
      await documentService.associateDocumentWithProject(documentId, selectedProjectId);
      await loadDocuments(selectedOrgId, selectedFolderId, selectedProjectId);
      toast({
        title: "Success",
        description: "Document added to project successfully",
        duration: 5000
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add document to project",
        variant: "destructive",
        duration: 5000
      });
      console.error(error);
    }
  }

  async function handleUnassignFromProject(documentId: string) {
    if (!selectedProjectId) return;
    try {
      await documentService.associateDocumentWithProject(documentId, null);
      // Refresh documents to reflect the change
      await loadDocuments(selectedOrgId, selectedFolderId, selectedProjectId);
      toast({
        title: "Success",
        description: "Document removed from project successfully",
        duration: 5000
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove document from project",
        variant: "destructive",
        duration: 5000
      });
      console.error("Failed to unassign document from project:", error);
    }
  }

  const handleTrashDocuments = useCallback(async (documentIds: string[]) => {
    if (!selectedOrgId) return;
    try {
      await Promise.all(documentIds.map(id => handleTrashItem(id, 'document')));
      await loadFolderData(selectedOrgId);
      await loadDocuments(selectedOrgId, selectedFolderId);
    } catch (error) {
      console.error("Failed to trash documents:", error);
    }
  }, [selectedOrgId, handleTrashItem, loadFolderData, loadDocuments, selectedFolderId]);

  const handleTrashFolders = useCallback(async (folderIds: string[]) => {
    if (!selectedOrgId) return;
    try {
      await Promise.all(folderIds.map(id => handleTrashItem(id, 'folder')));
      await loadFolderData(selectedOrgId);
      await loadDocuments(selectedOrgId, selectedFolderId);
    } catch (error) {
      console.error("Failed to trash folders:", error);
    }
  }, [selectedOrgId, handleTrashItem, loadFolderData, loadDocuments, selectedFolderId]);

  async function handleTrashItem(id: string, type: 'folder' | 'document') {
    if (!selectedOrgId) return;
    try {
      await documentService.trashItem(id, type, selectedOrgId);
      await loadFolderData(selectedOrgId);
      await loadDocuments(selectedOrgId, selectedFolderId);
    } catch (error) {
      console.error(`Failed to trash ${type}:`, error);
    }
  }

  async function handleRestoreItem(id: string, type: 'folder' | 'document') {
    if (!selectedOrgId) return;
    try {
      await documentService.restoreItem(id, type, selectedOrgId);
      await loadFolderData(selectedOrgId);
      await loadDocuments(selectedOrgId, selectedFolderId);
    } catch (error) {
      console.error(`Failed to restore ${type}:`, error);
    }
  }

  async function handlePermanentDelete(id: string, type: 'folder' | 'document') {
    if (!selectedOrgId) return;
    try {
      await documentService.permanentlyDelete(id, type, selectedOrgId);
    } catch (error) {
      console.error(`Failed to permanently delete ${type}:`, error);
    }
  }

  const handleCreateFolder = async (parentId: string | null, suggestedName: string) => {
    if (!hasWritePermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create folders",
        variant: "destructive",
        duration: 5000
      });
      return;
    }
    
    if (!selectedOrgId) return;
    
    try {
      const effectiveParentId = viewMode === "folders" ? null : parentId;

      const baseName = suggestedName || "New Folder";
      let counter = 1;
      let uniqueName = baseName;

      const siblingFolders = folders.filter((f) => f.parentId === effectiveParentId);
      while (true) {
        const nameExists = siblingFolders.some(
          (f) => f.name.toLowerCase() === uniqueName.toLowerCase()
        );
        if (!nameExists) break;
        uniqueName = `${baseName} (${counter++})`;
      }

      await documentService.createFolder(uniqueName, effectiveParentId, selectedOrgId);
      await loadFolderData(selectedOrgId);
      // Add this to refresh documents at root level for dashboard view
      if (viewMode === "dashboard") {
        await loadDocuments(selectedOrgId, null);
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  async function handleDeleteFolder(folderId: string) {
    if (!selectedOrgId) return
    try {
      await documentService.deleteFolder(folderId, selectedOrgId)
      await loadFolderData(selectedOrgId)
    } catch (error) {
      console.error("Failed to delete folder:", error)
    }
  }

  async function handleDeleteFolders(folderIds: string[]) {
    if (!selectedOrgId) return
    try {
      await Promise.all(folderIds.map(id => 
        documentService.deleteFolder(id, selectedOrgId)
      ))
      await loadFolderData(selectedOrgId)
    } catch (error) {
      console.error("Failed to delete folders:", error)
    }
  }

  async function handleRenameFolder(folderId: string, newName: string) {
    if (!selectedOrgId) return
    try {
      const trimmedNewName = newName.trim()
      const folder = folders.find((f) => f.id === folderId)
      if (!folder || folder.name === trimmedNewName) return

      const siblings = folders.filter(
        (f) => f.parentId === folder.parentId && f.id !== folder.id
      )
      const nameExists = siblings.some(
        (f) => f.name.toLowerCase() === trimmedNewName.toLowerCase()
      )

      if (nameExists) {
        let counter = 1
        let uniqueName = trimmedNewName
        while (
          siblings.some((f) => f.name.toLowerCase() === uniqueName.toLowerCase())
        ) {
          uniqueName = `${trimmedNewName} (${counter++})`
        }
        await documentService.renameFolder(folderId, uniqueName, selectedOrgId)
      } else {
        await documentService.renameFolder(folderId, trimmedNewName, selectedOrgId)
      }

      await loadFolderData(selectedOrgId)
    } catch (error) {
      console.error("Failed to rename folder:", error)
    }
  }

  async function handleMoveFolder(folderId: string, newParentId: string | null) {
    if (!selectedOrgId) return
    try {
      await documentService.moveFolder(folderId, newParentId, selectedOrgId)
      await loadFolderData(selectedOrgId)
    } catch (error) {
      console.error("Failed to move folder:", error)
    }
  }

  async function handleFileUpload(file: File) {
    if (!hasWritePermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to upload files",
        variant: "destructive",
        duration: 5000
      });
      return;
    }
    
    if (!selectedOrgId) return;
    
    try {
      await documentService.uploadDocument(file, selectedFolderId, selectedOrgId);
      // Refresh the documents list after upload
      await loadDocuments(selectedOrgId, selectedFolderId);
    } catch (error) {
      console.error("Upload failed:", error);
      // Add error handling here
    }
  }

  async function handleDownload(documentId: string, fileName: string) {
    try {
      const blob = await documentService.downloadDocument(documentId);
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName; // Use the original filename
      // Append to document, click and cleanup
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      // Add error handling/notification here
    }
  }

  function getFolderName(folderId: string): string {
    const folder = folders.find((f) => f.id === folderId)
    return folder ? folder.name : ""
  }

  async function handleRenameDocument(documentId: string, newName: string) {
    if (!selectedOrgId) return;
    try {
      await documentService.renameDocument(documentId, newName, selectedOrgId);
      await loadDocuments(selectedOrgId, selectedFolderId);
    } catch (error) {
      console.error("Failed to rename document:", error);
    }
  }

  const handleFolderClick = (folderId: string) => {
    setFolderHistory(prev => [...prev, selectedFolderId].filter(Boolean) as string[])
    setSelectedFolderId(folderId)
    setViewMode("folderContents")
    setDocuments([])
  }

  const handleBackClick = async () => {
    if (folderHistory.length > 0) {
      const previousFolder = folderHistory[folderHistory.length - 1]
      setFolderHistory(prev => prev.slice(0, -1))
      setSelectedFolderId(previousFolder)
      if (selectedOrgId) {
        await loadDocuments(selectedOrgId, previousFolder)
      }
    } else {
      setSelectedFolderId(null)
      setViewMode("dashboard")
      if (selectedOrgId) {
        await loadDocuments(selectedOrgId, null)
      }
    }
  }

  const handleFileUploadWrapper = useCallback(async (file: File) => {
    if (!selectedOrgId) return;
    await handleFileUpload(file);
  }, [selectedOrgId, handleFileUpload, hasWritePermission]);

  const handleDownloadWrapper = useCallback((documentId: string, fileName: string) => 
    handleDownload(documentId, fileName),
    [handleDownload]
  );

  const handleFolderClickWrapper = useCallback((folderId: string) => {
    handleFolderClick(folderId);
  }, [handleFolderClick]);

  const handleDeleteFoldersWrapper = useCallback((folderIds: string[]) => 
    handleDeleteFolders(folderIds),
    [handleDeleteFolders]
  );

  const handleCreateFolderWrapper = useCallback((parentId: string | null, name: string) => 
    handleCreateFolder(parentId, name),
    [handleCreateFolder, hasWritePermission]
  );

  const handleRenameDocumentWrapper = useCallback((documentId: string, newName: string) => 
    handleRenameDocument(documentId, newName),
    [handleRenameDocument]
  );

  return (
    <div className="flex h-full">
      {isSidebarVisible && hasWritePermission && (
        <FolderTree
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleRenameFolder}
          onMoveFolder={handleMoveFolder}
          onSelect={handleFolderClick}
          selectedFolderId={selectedFolderId}
          hasWritePermission={hasWritePermission} 
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {hasWritePermission && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className="mr-2"
              >
                {isSidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
            )}
            
            {selectedFolderId ? (
              <div className="flex items-center gap-2">
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
                    setSelectedFolderId(null);
                    setViewMode("dashboard");
                    setFolderHistory([]);
                    if (selectedOrgId) {
                      loadDocuments(selectedOrgId, null);
                    }
                  }}
                  className="gap-2 border border-gray-300"
                >
                  Dashboard
                </Button>
                <h2 className="text-xl font-semibold">
                  {getFolderName(selectedFolderId)} Contents
                </h2>
              </div>
            ) : (
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "dashboard" | "documents" | "folders" | "trash" | "overview")}>
                <TabsList>
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="folders">Folders</TabsTrigger>
                  {hasWritePermission && <TabsTrigger value="trash">Trash</TabsTrigger>}
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
  
        {viewMode === "documents" ? (
            <DocumentsTable
            documents={documents}
            onDocumentDownload={handleDownloadWrapper}
            onDeleteDocuments={handleTrashDocuments}
            onRenameDocument={handleRenameDocumentWrapper}
            hasWritePermission={hasWritePermission}
        />
        ) : viewMode === "overview" ? (
            <DocumentsOverview 
            documents={documents}
            folders={folderMetadata}
            onFolderClick={handleFolderClickWrapper}
            onDownload={handleDownloadWrapper}
        />
        ) : viewMode === "dashboard" ? (
          <DashboardTable 
            documents={documents}
            folders={folderMetadata.filter(f => f.parentId === null)}
            onDocumentDownload={handleDownloadWrapper}
            onDeleteDocuments={handleTrashDocuments}
            onDeleteFolders={handleTrashFolders}
            onFolderClick={handleFolderClickWrapper}
            showDownloadButton={true}
            onCreateFolder={(name) => handleCreateFolder(selectedFolderId, name)}
            onFileUpload={handleFileUploadWrapper}
            onRenameDocument={handleRenameDocumentWrapper}
            onRenameFolder={handleRenameFolder}
            currentProjectId={selectedProjectId}
            onAssociateWithProject={handleAssociateWithProject}
            onUnassignFromProject={handleUnassignFromProject}
            hasWritePermission={hasWritePermission}
          />
        ) : viewMode === "folders" ? (
            <FoldersTable 
                folders={folderMetadata}
                onFolderClick={handleFolderClickWrapper}
                onDeleteFolders={handleDeleteFoldersWrapper}
                onCreateFolder={handleCreateFolderWrapper}
                onRenameFolder={handleRenameFolder}
                hasWritePermission={hasWritePermission}
            />
        ) : viewMode === "trash" && selectedOrgId ? (
            <TrashView
                organizationId={selectedOrgId}
                onRestore={handleRestoreItem}
                onPermanentDelete={handlePermanentDelete}
            />
        ) : 
        viewMode === "folderContents" ? (
            <FolderContentsTable
                documents={documents}
                folders={folderMetadata.filter(f => f.parentId === selectedFolderId)}
                onDocumentDownload={handleDownloadWrapper}
                onFolderClick={handleFolderClickWrapper}
                onCreateFolder={(name) => handleCreateFolder(selectedFolderId, name)}
                onFileUpload={handleFileUploadWrapper}
                onDeleteItems={async (itemIds, type) => {
                    if (type === 'document') {
                        await handleTrashDocuments(itemIds);
                    } else {
                        await handleTrashFolders(itemIds);
                    }
                }}
                onRenameDocument={handleRenameDocumentWrapper}
                onRenameFolder={handleRenameFolder}
                hasWritePermission={hasWritePermission}
            />
          ) : null}
      </div>
    </div>
  )
}