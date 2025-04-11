import { useState } from "react"
import { Upload, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import AuthService from "@/services/auth";

export function DiDashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF file"
      })
    }
  }

  const handleExtractTables = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/extract-tables`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${AuthService.getRdmTokens()?.tokens.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to extract tables')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'extracted_tables.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success!",
        description: "Tables extracted successfully"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract tables from PDF"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto py-6 pr-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Document Intelligence</h1>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Table Extraction
            </CardTitle>
            <CardDescription>
              Upload a PDF file to extract tables and structured data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="pdf">PDF File</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="py-1.5"
                  disabled={isProcessing}
                />
              </div>
              <Button
                onClick={handleExtractTables}
                disabled={!file || isProcessing}
                className="w-fit"
              >
                {isProcessing ? (
                  <>
                    <Spinner className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Extract Tables
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}