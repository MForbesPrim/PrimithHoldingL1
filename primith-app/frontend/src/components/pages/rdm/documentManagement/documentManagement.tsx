import { useEffect, useState } from "react"
import { DocumentMetadata, FolderNode, FolderMetadata } from "@/types/document"
import { DocumentService } from "@/services/documentService"
import { Button } from "@/components/ui/button"
//import { FileUploader } from "@/components/pages/rdm/documentManagement/fileUploader"
import { FolderTree } from "@/components/pages/rdm/documentManagement/folderTree"
import { FoldersTable } from "@/components/pages/rdm/documentManagement/foldersTable"
import { DocumentsOverview } from "@/components/pages/rdm/documentManagement/documentsOverview"
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { DashboardTable } from "@/components/pages/rdm/documentManagement/dmDashboardTable"
import { DocumentsTable } from "@/components/pages/rdm/documentManagement/documentsTable"

export function DocumentManagement() {
 const [documents, setDocuments] = useState<DocumentMetadata[]>([])
 const [folders, setFolders] = useState<FolderNode[]>([])
 const [folderMetadata, setFolderMetadata] = useState<FolderMetadata[]>([])
 const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
 const [viewMode, setViewMode] = useState<"dashboard" | "documents" | "folders" | "overview">("dashboard")
 const [_isUploading, _setIsUploading] = useState(false)
 const [isSidebarVisible, setIsSidebarVisible] = useState(false)
 const [folderHistory, setFolderHistory] = useState<string[]>([])

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
  }, [selectedOrgId])

 useEffect(() => {
   if (selectedOrgId && selectedFolderId) {
     loadDocuments(selectedOrgId, selectedFolderId)
   }
 }, [selectedFolderId])

 async function handleDeleteDocuments(documentIds: string[]) {
    if (!selectedOrgId) return
    try {
      await Promise.all(documentIds.map(id => 
        documentService.deleteDocument(id, selectedOrgId)
      ))
      await loadFolderData(selectedOrgId)
      await loadDocuments(selectedOrgId, selectedFolderId)
    } catch (error) {
      console.error("Failed to delete documents:", error)
    }
  }

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

  async function loadDocuments(orgId: string, folderId: string | null) {
    try {
      const docs = await documentService.getDocuments(folderId, orgId)
      setDocuments(docs ?? [])
    } catch (error) {
      console.error("Failed to load documents:", error)
      setDocuments([])
    }
  }

 async function handleCreateFolder(parentId: string | null, suggestedName: string) {
    if (!selectedOrgId) return
    try {
      const effectiveParentId = viewMode === "folders" ? null : parentId;
      
      const baseName = suggestedName || "New Folder"
      let counter = 1
      let uniqueName = baseName
  
      const siblingFolders = folders.filter((f) => f.parentId === effectiveParentId)
      while (true) {
        const nameExists = siblingFolders.some(
          (f) => f.name.toLowerCase() === uniqueName.toLowerCase()
        )
        if (!nameExists) break
        uniqueName = `${baseName} (${counter++})`
      }
  
      await documentService.createFolder(uniqueName, effectiveParentId, selectedOrgId)
      await loadFolderData(selectedOrgId)
      // Add this to refresh documents at root level for dashboard view
      if (viewMode === "dashboard") {
        await loadDocuments(selectedOrgId, null)
      }
    } catch (error) {
      console.error("Failed to create folder:", error)
    }
  }

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
    if (!selectedOrgId) return
    try {
      await documentService.uploadDocument(file, selectedFolderId, selectedOrgId)
      // Refresh the documents list after upload
      await loadDocuments(selectedOrgId, selectedFolderId)
    } catch (error) {
      console.error("Upload failed:", error)
      // Add error handling here
    }
  }

 async function handleDownload(documentId: string, fileName: string) {
   try {
     const blob = await documentService.downloadDocument(documentId)
     const url = window.URL.createObjectURL(blob)
     const a = document.createElement("a")
     a.href = url
     a.download = fileName
     document.body.appendChild(a)
     a.click()
     window.URL.revokeObjectURL(url)
     document.body.removeChild(a)
   } catch (error) {
     console.error("Download failed:", error)
   }
 }

 function getFolderName(folderId: string): string {
   const folder = folders.find((f) => f.id === folderId)
   return folder ? folder.name : ""
 }

 const handleFolderClick = (folderId: string) => {
    setFolderHistory(prev => [...prev, selectedFolderId].filter(Boolean) as string[])
    setSelectedFolderId(folderId)
    setViewMode("documents")
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

 return (
    <div className="flex h-full">
      {isSidebarVisible && (
        <FolderTree
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleRenameFolder}
          onMoveFolder={handleMoveFolder}
          onSelect={handleFolderClick}
          selectedFolderId={selectedFolderId}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              className="mr-2"
            >
              {isSidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            
            {selectedFolderId ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackClick}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <h2 className="text-xl font-semibold">
                  {getFolderName(selectedFolderId)} Contents
                </h2>
              </>
            ) : (
              <>
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "dashboard" | "documents" | "folders" | "overview")}>
                  <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="folders">Folders</TabsTrigger>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            )}
          </div>
        </div>
  
        {viewMode === "documents" ? (
          <div className="space-y-4">
          <DocumentsTable
            documents={documents}
            onDocumentDownload={handleDownload}
            onDeleteDocuments={handleDeleteDocuments}
          />
          </div>
        ) : viewMode === "overview" ? (
          <DocumentsOverview 
            documents={documents}
            folders={folderMetadata}
            onFolderClick={handleFolderClick}
            onDownload={handleDownload}
          />
        ) : viewMode === "dashboard" ? (
          <div className="space-y-4">
            <DashboardTable 
            documents={documents}
            folders={folderMetadata.filter(f => f.parentId === null)}
            onDocumentDownload={handleDownload}
            onDeleteDocuments={handleDeleteDocuments}
            onDeleteFolders={handleDeleteFolders}
            onFolderClick={handleFolderClick}
            showDownloadButton={false}
            onCreateFolder={() => handleCreateFolder(null, "New Folder")}
            onFileUpload={handleFileUpload}
            />
          </div>
        ) : viewMode === "folders" ? (
          <div className="space-y-4">
            <FoldersTable 
                folders={folderMetadata}
                onFolderClick={handleFolderClick}
                onDeleteFolders={handleDeleteFolders}
                onCreateFolder={(parentId) => handleCreateFolder(parentId, "New Folder")}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}