import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Download, Receipt } from "lucide-react"

export function BillingPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your billing information and view invoices</p>
      </div>

      <div className="grid gap-6">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/2024</p>
                </div>
              </div>
              <Button variant="outline">Update Payment Method</Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Invoice Items */}
              {[
                { date: "Mar 1, 2024", amount: "$599.00", status: "Paid" },
                { date: "Feb 1, 2024", amount: "$599.00", status: "Paid" },
                { date: "Jan 1, 2024", amount: "$599.00", status: "Paid" },
              ].map((invoice, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.date}</p>
                      <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-green-600">{invoice.status}</span>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Enterprise Plan</h3>
                  <p className="text-sm text-muted-foreground">$599/month</p>
                </div>
                <Button>Change Plan</Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Next billing date: April 1, 2024
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 