import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "./sections/UserManagement"
import { RoleManagement } from "@/components/pages/admin/settings/sections/RoleManagement"
import { AdminSettingsHeader } from "./AdminSettingsHeader"

export function AdministrationPage() {
  return (
    <div className="flex-1">
      <AdminSettingsHeader 
        title="Administration" 
        description="Manage users, roles, and permissions" 
      />
      <div className="py-2 px-12">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage user accounts, permissions, and access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>
                  Configure roles and their associated permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 