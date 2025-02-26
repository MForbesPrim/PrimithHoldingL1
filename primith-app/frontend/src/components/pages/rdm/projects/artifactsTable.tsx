import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProjectArtifact } from "@/types/projects"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"

interface ArtifactsPageProps {
  artifacts: ProjectArtifact[];
  onStatusChange?: (artifactId: string, status: string) => Promise<void>;
}

export function ArtifactsPage({ 
  artifacts = [], 
  onStatusChange 
}: ArtifactsPageProps) {
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
      {renderArtifactTable(artifacts)}
    </div>
  )
}