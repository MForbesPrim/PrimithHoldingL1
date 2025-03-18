import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSettingsHeader } from "./AdminSettingsHeader";
import { Key, Calendar } from "lucide-react";
import AuthService, { License } from "@/services/auth";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function LicensingPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLicenses();
    
  }, []);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const data = await AuthService.getOrganizationLicenses();
      console.log("Received licenses:", data);
      setLicenses(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching licenses:", err);
      setError("Failed to load licenses. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch licenses",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to format dates
  const formatDate = (dateInput: string | Date) => {
    try {
      if (dateInput instanceof Date) {
        return format(dateInput, 'MMM d, yyyy');
      }
      return format(parseISO(dateInput), 'MMM d, yyyy');
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Calculate status for display
  const getLicenseStatus = (license: License) => {
    if (!license.isActive) return { label: 'Inactive', color: 'bg-gray-400' };
    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    
    if (expiresAt < now) return { label: 'Expired', color: 'bg-red-500' };
    
    // Check if expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    if (expiresAt < thirtyDaysFromNow) return { label: 'Expiring Soon', color: 'bg-yellow-500' };
    return { label: 'Active', color: 'bg-green-500' };
  };

  return (
    <div className="flex-1">
      <AdminSettingsHeader 
        title="Licensing" 
        description="View your organization's licenses" 
      />
      <div className="py-2 px-12">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active Licenses</CardTitle>
                <CardDescription>View your active licenses</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-4">Loading licenses...</div>
                ) : error ? (
                  <div className="text-center py-4 text-red-500">{error}</div>
                ) : licenses.length === 0 ? (
                  <div className="text-center py-4">No licenses found</div>
                ) : (
                  licenses.map((license) => {
                    const status = getLicenseStatus(license);
                    return (
                      <div key={license.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Key className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{license.licenseKey}</p>
                              <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {license.licenseType} • {license.seatsUsed}/{license.seatsAllowed === null || license.seatsAllowed === 0 ? '∞' : license.seatsAllowed} seats
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span className="text-sm">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              Expires: {formatDate(license.expiresAt)}
                            </span>
                            {license.autoRenew && (
                              <span className="text-xs text-green-600">Auto-renew enabled</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}