import { useEffect, useState } from "react"
import { DocumentMetadata, FolderNode } from "@/types/document"
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
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"

/**
 * DocumentManagement Component
 *
 * - Reads selectedOrgId from context
 * - Loads that org's folders & documents
 * - Renders a folder tree and a document table
 */
export function DocumentManagement() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // The organization ID the user selected in the header (via context)
  const { selectedOrgId } = useOrganization()

  const documentService = new DocumentService()

  // Whenever org changes, reset and load fresh data
  useEffect(() => {
    if (!selectedOrgId) {
      setFolders([])
      setDocuments([])
      setSelectedFolderId(null)
      return
    }
    loadFolders(selectedOrgId)
    loadDocuments(selectedOrgId, null)
    setSelectedFolderId(null)
  }, [selectedOrgId])

  // Whenever folder changes, load that folder's documents
  useEffect(() => {
    if (selectedOrgId) {
      loadDocuments(selectedOrgId, selectedFolderId)
    }
  }, [selectedFolderId])

  async function loadFolders(orgId: string) {
    try {
      const folderData = await documentService.getFolders(orgId)
      setFolders(folderData ?? [])
    } catch (error) {
      console.error("Failed to load folders:", error)
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

  // ----- Folder Methods -----
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
      await loadFolders(selectedOrgId)
    } catch (error) {
      console.error("Failed to create folder:", error)
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!selectedOrgId) return
    try {
      await documentService.deleteFolder(folderId, selectedOrgId)
      await loadFolders(selectedOrgId)
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

      // Check siblings for duplicates
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

      await loadFolders(selectedOrgId)
    } catch (error) {
      console.error("Failed to rename folder:", error)
    }
  }

  async function handleMoveFolder(folderId: string, newParentId: string | null) {
    if (!selectedOrgId) return
    try {
      await documentService.moveFolder(folderId, newParentId, selectedOrgId)
      await loadFolders(selectedOrgId)
    } catch (error) {
      console.error("Failed to move folder:", error)
    }
  }

  // ----- Document Methods -----
  async function handleFileUpload(file: File) {
    if (!selectedOrgId) return
    setIsUploading(true)
    try {
      await documentService.uploadDocument(file, selectedFolderId, selectedOrgId)
      await loadDocuments(selectedOrgId, selectedFolderId)
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

  // ----- Helpers -----
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

  function getFolderName(folderId: string): string {
    const folder = folders.find((f) => f.id === folderId)
    return folder ? folder.name : ""
  }

  return (
    <div className="flex h-full">
      {/* Folder Tree (Sidebar) */}
      <FolderTree
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
        onMoveFolder={handleMoveFolder}
        onSelect={setSelectedFolderId}
        selectedFolderId={selectedFolderId}
      />

      {/* Document List (Main) */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {selectedFolderId
              ? `${getFolderName(selectedFolderId)} Contents`
              : "All Documents"}
          </h2>
          <FileUploader onUpload={handleFileUpload} isUploading={isUploading} />
        </div>
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
      </div>
    </div>
  )
}
