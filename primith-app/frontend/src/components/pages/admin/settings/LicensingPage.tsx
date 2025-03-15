import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, Building } from "lucide-react"

export function LicensingPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Licensing</h1>
        <p className="text-muted-foreground">Manage your licenses and subscriptions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Current License Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current License</CardTitle>
            <CardDescription>Your active license details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Type</span>
                <span>Enterprise</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expires in 342 days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Current resource utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <span>245 / 500</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Organizations</span>
                </div>
                <span>3 / 5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>License Management</CardTitle>
            <CardDescription>Quick actions for your license</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full">Upgrade License</Button>
              <Button variant="outline" className="w-full">View License Details</Button>
              <Button variant="outline" className="w-full">Download License Key</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 