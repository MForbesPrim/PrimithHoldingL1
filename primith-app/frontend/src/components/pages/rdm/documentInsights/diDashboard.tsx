import { Table2, ArrowRight, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useNavigate } from "react-router-dom"

export function DiDashboard() {
  const navigate = useNavigate()

  const handleNavigateToTableExtraction = () => {
    navigate("/rdm/document-insights/table-extraction")
  }

  const handleNavigateToDocumentChat = () => {
    navigate("/rdm/document-insights/document-chat")
  }

  return (
    <div className="container mx-auto py-6 pr-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Document Insights</h1>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Table Extraction
            </CardTitle>
            <CardDescription>
              Extract tables and structured data from PDF documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleNavigateToTableExtraction}
                className="w-fit"
              >
                <Table2 className="mr-2 h-4 w-4" />
                Extract Tables
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Document Chat
            </CardTitle>
            <CardDescription>
              Chat with your PDF documents and get answers to your questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleNavigateToDocumentChat}
                className="w-fit"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat with Document
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}