// components/pages/admin/billingDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Download, PlusCircle, Trash2, Calendar as CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import AuthService, { BillingTransaction } from "@/services/auth"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

interface BillingDialogProps {
  open: boolean
  onClose: () => void
  organizationId: string
  isAdmin: boolean
}

interface BillingFormData {
  amount: number
  currency: string
  description: string
  invoiceNumber: string
  paymentMethod: string
  paymentStatus: string
  billingPeriodStart: string
  billingPeriodEnd: string
}

const defaultFormData: BillingFormData = {
  amount: 0,
  currency: "USD",
  description: "",
  invoiceNumber: "",
  paymentMethod: "credit_card",
  paymentStatus: "paid",
  billingPeriodStart: new Date().toISOString().split('T')[0],
  billingPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
}

// DatePicker component for date inputs
interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  label: string;
}

function DatePicker({ date, onSelect }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function BillingDialog({ open, onClose, organizationId, isAdmin }: BillingDialogProps) {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]) 
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<BillingFormData>(defaultFormData)
  const [startDate, setStartDate] = useState<Date | undefined>(
    formData.billingPeriodStart ? new Date(formData.billingPeriodStart) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    formData.billingPeriodEnd ? new Date(formData.billingPeriodEnd) : undefined
  )
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null) 
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("0.00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const { toast } = useToast()

  // Update formData when dates change
  useEffect(() => {
    if (startDate) {
      setFormData(prev => ({
        ...prev,
        billingPeriodStart: startDate.toISOString().split('T')[0]
      }))
    }
  }, [startDate])

  useEffect(() => {
    if (endDate) {
      setFormData(prev => ({
        ...prev,
        billingPeriodEnd: endDate.toISOString().split('T')[0]
      }))
    }
  }, [endDate])

  const fetchBillingHistory = async (page = 1) => {
    try {
      setLoading(true)
      const offset = (page - 1) * itemsPerPage
      const data = await AuthService.getBillingHistory(organizationId, itemsPerPage, offset)
      setTransactions(data.transactions)
      setTotalItems(data.pagination.total)
    } catch (error) {
      console.error('Failed to fetch billing history:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch billing history",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && organizationId) {
      fetchBillingHistory()
    }
  }, [open, organizationId])

  useEffect(() => {
    if (open) {
      fetchBillingHistory(currentPage)
    }
  }, [currentPage, open])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the current input value
    const inputValue = e.target.value;
    
    // Allow only numbers and a single decimal point
    // This regex allows: empty string, single decimal point, numbers, and one decimal point with numbers
    if (/^$|^[0-9]+(\.[0-9]*)?$|^\.[0-9]*$/.test(inputValue)) {
      setAmount(inputValue);
      
      // Update the form data with the numeric value
      const numValue = parseFloat(inputValue) || 0;
      setFormData(prev => ({ ...prev, amount: numValue }));
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return
    
    try {
      await AuthService.deleteBillingTransaction(organizationId, transactionToDelete)
      setTransactionToDelete(null)
      setDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
        duration: 5000,
      })
      fetchBillingHistory(currentPage)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete transaction",
        duration: 5000,
      })
    }
  }

  const handleAddTransaction = async () => {
    try {
      setIsSubmitting(true); // Set loading state to true when starting
  
      // Create FormData if using file upload
      const formDataToSend = new FormData();
      
      // Add transaction details
      formDataToSend.append('amount', formData.amount.toString());
      formDataToSend.append('currency', formData.currency);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('invoiceNumber', formData.invoiceNumber);
      formDataToSend.append('paymentMethod', formData.paymentMethod);
      formDataToSend.append('paymentStatus', formData.paymentStatus);
      formDataToSend.append('billingPeriodStart', formData.billingPeriodStart);
      formDataToSend.append('billingPeriodEnd', formData.billingPeriodEnd);
      
      // Add invoice file if available
      if (invoiceFile) {
        formDataToSend.append('invoiceFile', invoiceFile);
      }
      
      // Call the API with the form data
      await AuthService.addBillingTransactionWithInvoice(organizationId, formDataToSend);
      
      toast({
        title: "Success",
        description: "Transaction added successfully",
        duration: 5000,
      });
      setShowAddForm(false);
      setFormData(defaultFormData);
      setInvoiceFile(null);
      fetchBillingHistory();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add transaction",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false); // Reset loading state regardless of outcome
    }
  };

  const downloadInvoice = async (transactionId: string) => {
    try {
      setIsDownloading(transactionId); // Add this state to track which invoice is downloading
      
      // Use the AuthService to get the blob
      const blob = await AuthService.downloadInvoice(transactionId);
      
      // Create object URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${transactionId}.pdf`;
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
    } finally {
      setIsDownloading(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) handlePageChange(currentPage - 1);
              }}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {/* First page */}
          {currentPage > 2 && (
            <PaginationItem>
              <PaginationLink 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(1);
                }}
              >
                1
              </PaginationLink>
            </PaginationItem>
          )}
          
          {/* Ellipsis for large gaps */}
          {currentPage > 3 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          
          {/* Previous page */}
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationLink 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
              >
                {currentPage - 1}
              </PaginationLink>
            </PaginationItem>
          )}
          
          {/* Current page */}
          <PaginationItem>
            <PaginationLink 
              href="#" 
              isActive
              onClick={(e) => e.preventDefault()}
            >
              {currentPage}
            </PaginationLink>
          </PaginationItem>
          
          {/* Next page */}
          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationLink 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
              >
                {currentPage + 1}
              </PaginationLink>
            </PaginationItem>
          )}
          
          {/* Ellipsis for large gaps */}
          {currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          
          {/* Last page */}
          {currentPage < totalPages - 1 && (
            <PaginationItem>
              <PaginationLink 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(totalPages);
                }}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}
          
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) handlePageChange(currentPage + 1);
              }}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderAddForm = () => (
    <div className="border rounded-md p-4 my-4">
      <h3 className="text-lg font-medium mb-4">Add New Transaction</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2">
                <Select 
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="$" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">$</SelectItem>
                    <SelectItem value="EUR">€</SelectItem>
                    <SelectItem value="GBP">£</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="amount"
                  type="text"
                  className="flex-1"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingPeriodStart">Billing Period Start</Label>
          <DatePicker 
            date={startDate}
            onSelect={(date) => setStartDate(date)}
            label="Billing Period Start"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingPeriodEnd">Billing Period End</Label>
          <DatePicker 
            date={endDate}
            onSelect={(date) => setEndDate(date)}
            label="Billing Period End"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select
            value={formData.paymentStatus}
            onValueChange={(value) => setFormData(prev => ({ ...prev, paymentStatus: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="invoiceFile">Upload Invoice (PDF)</Label>
          <Input
            id="invoiceFile"
            type="file"
            accept=".pdf"
            onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
          />
          {invoiceFile && (
            <p className="text-xs text-muted-foreground">
              Selected file: {invoiceFile.name}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <div className="flex justify-end space-x-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setShowAddForm(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddTransaction} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Transaction"
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM dd, yyyy');
  }

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    })
    return formatter.format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Billing History</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {isAdmin && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)} className="mb-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            )}
            
            {isAdmin && showAddForm && renderAddForm()}
            
            {(!transactions || transactions.length === 0) ? (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No billing transactions found for this organization.</p>
            </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="font-medium">{formatDate(transaction.createdAt)}</div>
                          <div className="text-xs text-muted-foreground">
                            Invoice #{transaction.invoiceNumber || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{transaction.description || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            Period: {formatDate(transaction.billingPeriodStart)} - {formatDate(transaction.billingPeriodEnd)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {transaction.invoiceUrl && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => downloadInvoice(transaction.id)}
                                disabled={isDownloading === transaction.id}
                              >
                                {isDownloading === transaction.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-1" />
                                )}
                                {isDownloading === transaction.id ? "Downloading..." : "Invoice"}
                              </Button>
                            )}
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => {
                                  setTransactionToDelete(transaction.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && renderPagination()}
              </>
            )}
          </>
        )}
      </DialogContent>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction and its associated invoice.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}