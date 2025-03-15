import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Role } from "@/services/auth"

export function RoleManagement() {
  const [roles] = useState<Partial<Role>[]>([
    {
      name: "Admin",
      description: "Full system access",
      organizationId: null,
    },
    {
      name: "Manager",
      description: "Can manage team members and projects",
      organizationId: "org-1",
    },
    {
      name: "User",
      description: "Basic access to system features",
      organizationId: "org-1",
    },
  ])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Roles</h3>
          <p className="text-sm text-muted-foreground">
            Manage roles and their permissions
          </p>
        </div>
        <Button>Create Role</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>
                  {role.organizationId ? "Organization" : "Global"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm">
                      Permissions
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 