import { ProjectArtifact } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ArtifactsTableProps {
  artifacts: ProjectArtifact[];
  onStatusChange: (artifactId: string, status: string) => Promise<void>;
}

export function ArtifactsTable({ artifacts }: ArtifactsTableProps) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Assigned To</TableCell>
            <TableCell>Due Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artifacts.map((artifact) => (
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
                <Button variant="ghost" size="sm">View</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}