import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2, Receipt } from "lucide-react"
import { AdminSettingsHeader } from "./AdminSettingsHeader"
import AuthService, { BillingTransaction, License } from "@/services/auth"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<BillingTransaction[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [_orgId, setOrgId] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // First get the user's organization(s)
        const orgs = await AuthService.getRdmOrganizations()
        if (orgs && orgs.length > 0) {
          const organizationId = orgs[0].id // Using the first org for simplicity
          setOrgId(organizationId)
          
          // Fetch billing history for the organization
          const billingData = await AuthService.getBillingHistory(organizationId, 10, 0)
          setTransactions(billingData.transactions || [])
          
          // Fetch licenses (current plan)
          const licensesData = await AuthService.getOrganizationLicenses()
          setLicenses(licensesData || [])
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load billing information",
          duration: 5000,
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [toast])

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A'
    return format(new Date(date), "MMM d, yyyy")
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="text-sm text-green-600">Paid</span>
      case 'pending':
        return <span className="text-sm text-yellow-600">Pending</span>
      case 'failed':
        return <span className="text-sm text-red-600">Failed</span>
      case 'refunded':
        return <span className="text-sm text-blue-600">Refunded</span>
      default:
        return <span className="text-sm text-muted-foreground">{status}</span>
    }
  }

  // Find the active license (current plan)
  const activeLicense = licenses.find(license => license.isActive)
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1">
      <AdminSettingsHeader 
        title="Billing" 
        description="View your billing information and invoices" 
      />
      <div className="py-2 px-12">
        <div className="grid gap-6">
          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your past invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No billing history available</p>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{formatDate(transaction.createdAt)}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.description || 'Invoice'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <p className="font-medium">{formatCurrency(transaction.amount, transaction.currency)}</p>
                          {getStatusBadge(transaction.paymentStatus)}
                        </div>
                        {transaction.invoiceUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                              try {
                                // Get the blob from the service
                                const blob = await AuthService.downloadInvoice(transaction.id);
                                
                                // Create a URL for the blob
                                const url = window.URL.createObjectURL(blob);
                                
                                // Create a download link
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = `invoice-${transaction.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                
                                // Clean up
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Failed to download invoice:', error);
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: "Failed to download invoice",
                                  duration: 5000,
                                });
                              }
                            }}
                            aria-label="Download invoice"
                            title="Download invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription plan details</CardDescription>
            </CardHeader>
            <CardContent>
              {!activeLicense ? (
                <p className="text-center text-muted-foreground py-4">No active subscription found</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{activeLicense.licenseType} Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        {activeLicense.seatsUsed} / {activeLicense.seatsAllowed === null || activeLicense.seatsAllowed === 0 ? '∞' : activeLicense.seatsAllowed} seats used
                      </p>
                    </div>
                    <Badge 
                      variant={
                        new Date(activeLicense.expiresAt) < new Date() 
                          ? "destructive" 
                          : "success"
                      }
                    >
                      {new Date(activeLicense.expiresAt) < new Date() 
                        ? "Expired" 
                        : "Active"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Started: {formatDate(activeLicense.startsAt)}</div>
                    <div>Expires: {formatDate(activeLicense.expiresAt)}</div>
                    {activeLicense.autoRenew && (
                      <div className="mt-2">
                        <Badge variant="outline">Auto-renew enabled</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}