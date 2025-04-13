import { useState } from "react"
import { Upload, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import AuthService from "@/services/auth"
import { useNavigate } from "react-router-dom"

export function TableExtraction() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      if (selectedFile.size > 25 * 1024 * 1024) { // 25MB in bytes
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 25MB",
          duration: 2000
        })
        return
      }
      setFile(selectedFile)
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF file",
        duration: 2000
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
        description: "Tables extracted successfully",
        duration: 2000
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract tables from PDF",
        duration: 2000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBack = () => {
    navigate("/rdm/document-insights")
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Table Extraction</h1>
        </div>
      </div>
      
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload PDF
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
                <div className="text-xs text-muted-foreground">
                  <p>Note: The extraction tool may make mistakes and should be double-checked for accuracy.</p>
                  <p>Maximum file size: 25MB</p>
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
    </div>
  )
} 