import { DocumentMetadata, FolderMetadata } from "@/types/document"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, File, Folder } from "lucide-react"

interface DocumentsDashboardProps {
  documents: DocumentMetadata[]
  folders: FolderMetadata[]
  onFolderClick: (folderId: string) => void
  onDownload: (documentId: string, fileName: string) => void
}

export function DocumentsOverview({ 
  documents, 
  folders, 
  onFolderClick, 
  onDownload 
}: DocumentsDashboardProps) {
  const recentDocuments = documents.slice(0, 5)
  const recentFolders = folders.slice(0, 5)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Documents</span>
              <span className="text-lg font-bold">{documents.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Folders</span>
              <span className="text-lg font-bold">{folders.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentDocuments.map(doc => (
              <div key={doc.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <span className="text-sm">{doc.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDownload(doc.id, doc.name)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Folders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentFolders.map(folder => (
              <div 
                key={folder.id} 
                className="flex items-center justify-between cursor-pointer hover:bg-accent rounded-md p-2"
                onClick={() => onFolderClick(folder.id)}
              >
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 fill-blue-500 stroke-blue-500 stroke-[1.5]" />
                  <span className="text-sm">{folder.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {folder.fileCount} files
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}