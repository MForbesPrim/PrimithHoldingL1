import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProjectArtifact, ArtifactStatus, ProjectMember } from "@/types/projects"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  getFilteredRowModel,
} from "@tanstack/react-table"
import { ChevronsUpDown, ChevronUp, ChevronDown, Edit, X, Search, Eye, Download } from "lucide-react"

interface ArtifactsPageProps {
  artifacts: ProjectArtifact[];
  projectId: string;
  projectService: any;
  artifactStatuses?: ArtifactStatus[];
  onUpdateArtifact?: (artifactId: string, data: Partial<ProjectArtifact>) => Promise<void>;
  onDownloadArtifact?: (artifactId: string, fileName: string) => Promise<void>;
  onViewPage?: (pageId: string) => void;
}

export function ArtifactsPage({ 
  artifacts = [], 
  projectId,
  onUpdateArtifact,
  onDownloadArtifact,
  onViewPage,
  projectService
}: ArtifactsPageProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState<ProjectArtifact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [artifactStatuses, setArtifactStatuses] = useState<ArtifactStatus[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Custom filter function to search across multiple fields
  const fuzzyFilter = (row: any, _columnId: string, value: string) => {
    const searchValue = value.toLowerCase();
    const artifact = row.original;
    
    // Search across multiple fields
    return (
      artifact.name?.toLowerCase().includes(searchValue) ||
      artifact.type?.toLowerCase().includes(searchValue) ||
      artifact.status?.toLowerCase().includes(searchValue) ||
      artifact.assignedToEmail?.toLowerCase().includes(searchValue) ||
      artifact.description?.toLowerCase().includes(searchValue)
    );
  };

  type FormValues = {
    name: string;
    description: string;
    type: string;
    status: string;
    statusId: string;
    assignedTo: string; // This can be empty string but not null
  }
  
  const [formValues, setFormValues] = useState<FormValues>({
    name: "",
    description: "",
    type: "",
    status: "",
    statusId: "",
    assignedTo: ""
  });
  
  // Fetch artifact statuses when component mounts
useEffect(() => {
  const fetchStatuses = async () => {
    if (artifactStatuses?.length) {
      // Use the statuses provided by the parent
      setArtifactStatuses(artifactStatuses);
      return;
    }
    
    // Otherwise fetch them
    setLoading(true);
    try {
      const statuses = await projectService.getArtifactStatuses(projectId);
      setArtifactStatuses(statuses);
    } catch (error) {
      console.error("Failed to fetch artifact statuses:", error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchStatuses();
}, [projectId, projectService, artifactStatuses]);

useEffect(() => {
  const fetchProjectMembers = async () => {
    try {
      const members = await projectService.getProjectMembers(projectId);
      setProjectMembers(members);
    } catch (error) {
      console.error("Failed to fetch project members:", error);
    }
  };
  
  if (projectId) {
    fetchProjectMembers();
  }
}, [projectId, projectService]);
  
  // Function to get status color based on status ID
  const getStatusColor = (statusId: string): string => {
    const status = artifactStatuses.find(s => s.id === statusId);
    return status?.color || "#6B7280"; // Default gray color if not found
  };
  
  // Function to get status name based on status ID
  const getStatusName = (statusId: string): string => {
    const status = artifactStatuses.find(s => s.id === statusId);
    return status?.name || "Unknown";
  };
  
  // Function to handle opening the edit dialog
  const handleEditClick = (artifact: ProjectArtifact) => {
    setSelectedArtifact(artifact);
    
    // Find the statusId that corresponds to the artifact's status
    let statusId = artifact.statusId || "";
    
    // If there's no statusId but there is a status, try to find the matching status
    if (!statusId && artifact.status && artifactStatuses.length > 0) {
      const matchingStatus = artifactStatuses.find(
        s => s.name.toLowerCase().replace(/ /g, '_') === artifact.status.toLowerCase()
      );
      if (matchingStatus) {
        statusId = matchingStatus.id;
      }
    }
    
    // Set initial form values from the artifact
    setFormValues({
      name: artifact.type === 'document' ? artifact.name.split('.')[0] : artifact.name,
      description: artifact.description || "",
      type: artifact.type,
      status: artifact.status || "",
      statusId: statusId,
      assignedTo: artifact.assignedTo || ""
    });
    
    setIsEditDialogOpen(true);
  };
  // Function to handle form submission
  const handleSubmit = () => {
    if (selectedArtifact && onUpdateArtifact) {
      // Preserve file extension for documents
      let finalName = formValues.name;
      
      if (selectedArtifact.type === 'document' && selectedArtifact.name.includes('.')) {
        const fileExt = selectedArtifact.name.split('.').pop();
        // Preserve the case of the extension
        finalName = `${formValues.name}.${fileExt}`;
      }
      
      // Get the status code from the selected status
      const selectedStatus = artifactStatuses.find(s => s.id === formValues.statusId);
      const assignedToValue = formValues.assignedTo === "" ? undefined : formValues.assignedTo;

      onUpdateArtifact(selectedArtifact.id, {
        name: finalName,
        description: formValues.description,
        status: selectedStatus?.name.toLowerCase().replace(/ /g, '_') || formValues.status,
        statusId: formValues.statusId,
        assignedTo: assignedToValue // This will be string or undefined, not null
      });
      
      setIsEditDialogOpen(false);
    }
  };

  const columns: ColumnDef<ProjectArtifact>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <div className="flex items-center">
          Name
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true);
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting();
              } else {
                column.toggleSorting(false);
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <div className="flex items-center">
          Type
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true);
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting();
              } else {
                column.toggleSorting(false);
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const type = row.original.type;
        return type.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <div className="flex items-center">
          Status
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true);
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting();
              } else {
                column.toggleSorting(false);
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        // Use statusId if available, otherwise fall back to status string
        if (row.original.statusId) {
          const color = getStatusColor(row.original.statusId);
          const name = getStatusName(row.original.statusId);
          return (
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: color }} 
              />
              <span>{name}</span>
            </div>
          );
        }
        
        // Legacy status handling
        return (
          <Badge variant={
            row.original.status === 'completed' ? 'secondary' :
            row.original.status === 'delayed' ? 'destructive' :
            row.original.status === 'in_progress' ? 'default' :
            'outline'
          }>
            {row.original.status.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "assignedToEmail", // Change from "assignedTo" to "assignedToEmail"
      header: ({ column }) => (
        <div className="flex items-center">
          Assigned To
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true);
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting();
              } else {
                column.toggleSorting(false);
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        // Display a nice formatted version or a dash if not assigned
        return row.original.assignedToEmail || "";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const artifact = row.original;
        return (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleEditClick(artifact)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                if (artifact.type === 'page' && onViewPage && artifact.pageId) {
                  onViewPage(artifact.pageId);
                } else if (artifact.type !== 'page' && onDownloadArtifact && artifact.documentId) {
                  onDownloadArtifact(artifact.documentId, artifact.name);
                }
              }}
              title={artifact.type === 'page' ? 'View Page' : 'Download'}
            >
              {artifact.type === 'page' ? (
                <Eye className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: artifacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      globalFilter: searchQuery,
    },
    onGlobalFilterChange: setSearchQuery,
    globalFilterFn: fuzzyFilter,
  });

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
        <p className="text-gray-500">No artifacts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative w-[300px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No artifacts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Artifact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Name field with extension display for documents */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex">
                <Input
                  id="name"
                  value={formValues.name}
                  onChange={(e) => setFormValues({...formValues, name: e.target.value})}
                  className={selectedArtifact?.type === 'document' ? "rounded-r-none border-r-0 h-10" : " h-10"}
                />
                {selectedArtifact?.type === 'document' && selectedArtifact?.name.includes('.') && (
                  <div 
                    className="flex items-center px-3 border rounded-r-md bg-background text-muted-foreground text-sm h-10" 
                    style={{ lineHeight: "normal" }}
                  >
                    {`.${selectedArtifact.name.split('.').pop()}`}
                  </div>
                )}
              </div>
            </div>
            
            {/* Status dropdown using the new status system */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <div className="relative">
                <Select 
                  value={formValues.statusId}
                  onValueChange={(value) => setFormValues({...formValues, statusId: value})}
                  disabled={loading || artifactStatuses.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Loading statuses..." : "Select a status"} />
                  </SelectTrigger>
                  <SelectContent>
                    {artifactStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: status.color }} 
                          />
                          <span>{status.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formValues.statusId && (
                  <button
                    type="button"
                    onClick={() => setFormValues({...formValues, statusId: ""})}
                    className="absolute right-8 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <div className="relative">
                <Select 
                  value={formValues.assignedTo}
                  onValueChange={(value) => setFormValues({...formValues, assignedTo: value})}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectMembers.map((member) => (
                      <SelectItem key={member.id} value={member.userId}>
                        {member.userName || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formValues.assignedTo && (
                  <button
                    type="button"
                    onClick={() => setFormValues({...formValues, assignedTo: ""})}
                    className="absolute right-8 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Description field */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formValues.description}
                onChange={(e) => setFormValues({...formValues, description: e.target.value})}
                placeholder="Add a description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}