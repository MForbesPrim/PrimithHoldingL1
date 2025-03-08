import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProjectArtifact } from "@/types/projects"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { useState } from "react"
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table"
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react"

interface ArtifactsPageProps {
  artifacts: ProjectArtifact[];
  onStatusChange?: (artifactId: string, status: string) => Promise<void>;
}

export function ArtifactsPage({ 
  artifacts = [], 
  onStatusChange 
}: ArtifactsPageProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

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
                column.toggleSorting(true); // Set to desc
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting(); // Clear sorting
              } else {
                column.toggleSorting(false); // Set to asc
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
      cell: ({ row }) => (
        <Badge variant={
          row.original.status === 'approved' ? 'secondary' :
          row.original.status === 'rejected' ? 'destructive' :
          'default'
        }>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "assignedTo",
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
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <div className="flex items-center">
          Due Date
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
      cell: ({ row }) => row.original.dueDate && new Date(row.original.dueDate).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onStatusChange && onStatusChange(row.original.id, 'viewed')}
        >
          View
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: artifacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
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
    </div>
  );
}