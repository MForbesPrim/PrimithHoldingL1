import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  File, 
  Image, 
  FileText,  
  CheckSquare, 
  Flag, 
  Package,
  ListFilter 
} from "lucide-react"
import { ProjectArtifact } from "@/types/projects"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ArtifactsPageProps {
  artifacts: ProjectArtifact[];
  onStatusChange?: (artifactId: string, status: string) => Promise<void>;
}

export function ArtifactsPage({ 
  artifacts = [], 
  onStatusChange 
}: ArtifactsPageProps) {
  const [activeTab, setActiveTab] = useState("all")

  const categorizeArtifacts = () => {
    const safeArtifacts = artifacts || [];

    return {
      all: safeArtifacts,
      documents: safeArtifacts.filter(artifact => 
        artifact && artifact.type === 'document'
      ),
      tasks: safeArtifacts.filter(artifact => 
        artifact && artifact.type === 'task'
      ),
      pages: safeArtifacts.filter(artifact => 
        artifact && artifact.type === 'page'
      ),
      images: safeArtifacts.filter(artifact => 
        artifact && artifact.type === 'image'
      ),
      milestones: safeArtifacts.filter(artifact => 
        artifact && artifact.type === 'milestone'
      ),
      deliverables: safeArtifacts.filter(artifact => 
        artifact && artifact.type === 'deliverable'
      )
    }
  }

  const { 
    all,
    documents, 
    tasks, 
    pages, 
    images, 
    milestones, 
    deliverables 
  } = categorizeArtifacts()

  const renderArtifactTable = (artifactList: ProjectArtifact[]) => {
    if (!artifactList || artifactList.length === 0) {
      return (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
          <p className="text-gray-500">No artifacts found</p>
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artifactList.map((artifact) => (
            <TableRow key={artifact.id}>
              <TableCell>{artifact.name}</TableCell>
              <TableCell>{artifact.type}</TableCell>
              <TableCell>
                <Badge variant={
                  artifact.status === 'approved' ? 'secondary' :
                  artifact.status === 'rejected' ? 'destructive' :
                  'default'
                }>
                  {artifact.status}
                </Badge>
              </TableCell>
              <TableCell>{artifact.assignedTo}</TableCell>
              <TableCell>
                {artifact.dueDate && new Date(artifact.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onStatusChange && onStatusChange(artifact.id, 'viewed')}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <File className="h-4 w-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Deliverables
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {renderArtifactTable(all)}
        </TabsContent>
        
        <TabsContent value="documents" className="mt-4">
          {renderArtifactTable(documents)}
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-4">
          {renderArtifactTable(tasks)}
        </TabsContent>
        
        <TabsContent value="pages" className="mt-4">
          {renderArtifactTable(pages)}
        </TabsContent>
        
        <TabsContent value="images" className="mt-4">
          {renderArtifactTable(images)}
        </TabsContent>
        
        <TabsContent value="milestones" className="mt-4">
          {renderArtifactTable(milestones)}
        </TabsContent>
        
        <TabsContent value="deliverables" className="mt-4">
          {renderArtifactTable(deliverables)}
        </TabsContent>
      </Tabs>
    </div>
  )
}