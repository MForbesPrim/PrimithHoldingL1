import { useEffect, useState } from "react"
import { DocumentMetadata, FolderNode, FolderMetadata } from "@/types/document"
import { DocumentService } from "@/services/documentService"
import { Button } from "@/components/ui/button"
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table"
import { FileUploader } from "@/components/pages/rdm/documentManagement/fileUploader"
import { FolderTree } from "@/components/pages/rdm/documentManagement/folderTree"
import { FoldersTable } from "@/components/pages/rdm/documentManagement/foldersTable"
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"

export function DocumentManagement() {
 const [documents, setDocuments] = useState<DocumentMetadata[]>([])
 const [folders, setFolders] = useState<FolderNode[]>([])
 const [folderMetadata, setFolderMetadata] = useState<FolderMetadata[]>([])
 const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
 const [viewMode, setViewMode] = useState<"folders" | "documents">("folders")
 const [isUploading, setIsUploading] = useState(false)

 const { selectedOrgId } = useOrganization()
 const documentService = new DocumentService()

 useEffect(() => {
   if (!selectedOrgId) {
     setFolders([])
     setDocuments([])
     setFolderMetadata([])
     setSelectedFolderId(null)
     return
   }
   loadFolderData(selectedOrgId)
 }, [selectedOrgId])

 useEffect(() => {
   if (selectedOrgId && selectedFolderId) {
     loadDocuments(selectedOrgId, selectedFolderId)
   }
 }, [selectedFolderId])

 async function loadFolderData(orgId: string) {
    try {
      const [folderData, documentData] = await Promise.all([
        documentService.getFolders(orgId),
        documentService.getDocuments(null, orgId)
      ])
   
      setFolders(folderData ?? [])
      setDocuments(documentData ?? [])
   
      const metadata = (folderData ?? []).map(folder => {
        const folderDocs = documentData?.filter(doc => doc.folderId === folder.id) ?? []
   
        return {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          fileCount: folderDocs.length,
          updatedAt: new Date(folder.updatedAt).toISOString(),
          lastUpdatedBy: folder.lastUpdatedBy
        }
      })
   
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
     const baseName = suggestedName || "New Folder"
     let counter = 1
     let uniqueName = baseName

     const siblingFolders = folders.filter((f) => f.parentId === parentId)
     while (true) {
       const nameExists = siblingFolders.some(
         (f) => f.name.toLowerCase() === uniqueName.toLowerCase()
       )
       if (!nameExists) break
       uniqueName = `${baseName} (${counter++})`
     }

     await documentService.createFolder(uniqueName, parentId, selectedOrgId)
     await loadFolderData(selectedOrgId)
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
   setIsUploading(true)
   try {
     await documentService.uploadDocument(file, selectedFolderId, selectedOrgId)
     if (selectedFolderId) {
       await loadDocuments(selectedOrgId, selectedFolderId)
     }
     await loadFolderData(selectedOrgId)
   } catch (error) {
     console.error("Upload failed:", error)
   } finally {
     setIsUploading(false)
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
   setSelectedFolderId(folderId)
   setViewMode("documents")
 }

 function formatFileSize(bytes: number): string {
   const units = ["B", "KB", "MB", "GB"]
   let size = bytes
   let unitIndex = 0

   while (size >= 1024 && unitIndex < units.length - 1) {
     size /= 1024
     unitIndex++
   }
   return `${size.toFixed(1)} ${units[unitIndex]}`
 }

 return (
   <div className="flex h-full">
     <FolderTree
       folders={folders}
       onCreateFolder={handleCreateFolder}
       onDeleteFolder={handleDeleteFolder}
       onRenameFolder={handleRenameFolder}
       onMoveFolder={handleMoveFolder}
       onSelect={handleFolderClick}
       selectedFolderId={selectedFolderId}
     />

     <div className="flex-1 p-4">
       <div className="flex justify-between items-center mb-4">
         <div className="flex items-center gap-2">
           <h2 className="text-xl font-semibold">
             {viewMode === "folders" 
               ? "All Folders" 
               : `${getFolderName(selectedFolderId!)} Contents`}
           </h2>
           {viewMode === "documents" && (
             <Button
               variant="ghost"
               onClick={() => setViewMode("folders")}
             >
               Back to Folders
             </Button>
           )}
         </div>
         <FileUploader onUpload={handleFileUpload} isUploading={isUploading} />
       </div>

       {viewMode === "folders" ? (
         <FoldersTable 
           folders={folderMetadata}
           onFolderClick={handleFolderClick}
         />
       ) : (
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Name</TableHead>
               <TableHead>Type</TableHead>
               <TableHead>Size</TableHead>
               <TableHead>Version</TableHead>
               <TableHead>Last Modified</TableHead>
               <TableHead>Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {documents.map((doc) => (
               <TableRow key={doc.id}>
                 <TableCell>{doc.name}</TableCell>
                 <TableCell>{doc.fileType}</TableCell>
                 <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                 <TableCell>v{doc.version}</TableCell>
                 <TableCell>
                   {new Date(doc.updatedAt).toLocaleDateString()}
                 </TableCell>
                 <TableCell>
                   <Button
                     variant="ghost"
                     onClick={() => handleDownload(doc.id, doc.name)}
                   >
                     Download
                   </Button>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       )}
     </div>
   </div>
 )
}