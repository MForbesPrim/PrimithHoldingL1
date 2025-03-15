import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminSettingsHeader } from "./AdminSettingsHeader"
import { Button } from "@/components/ui/button"
import { Key, Plus } from "lucide-react"

export function LicensingPage() {
  return (
    <div className="flex-1">
      <AdminSettingsHeader 
        title="Licensing" 
        description="View and manage your licenses" 
      />
      <div className="py-2 px-12">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Active Licenses</CardTitle>
                  <CardDescription>View and manage your active licenses</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add License
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    key: "XXXX-XXXX-XXXX-1234",
                    type: "Enterprise",
                    seats: 50,
                    expiresAt: "2025-03-01",
                  },
                  {
                    key: "XXXX-XXXX-XXXX-5678",
                    type: "Professional",
                    seats: 20,
                    expiresAt: "2024-12-31",
                  },
                ].map((license, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{license.key}</p>
                        <p className="text-sm text-muted-foreground">
                          {license.type} • {license.seats} seats
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Expires: {new Date(license.expiresAt).toLocaleDateString()}
                      </span>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 