import { useState, useRef, useEffect } from "react"
import { Upload, ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import AuthService from "@/services/auth"
import { useNavigate } from "react-router-dom"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TableData {
  headers: string[];
  rows: string[][];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  table?: TableData;
}

// Function to parse markdown tables from text
const parseMarkdownTable = (text: string): { content: string; table?: TableData } => {
  // Regular expression to match markdown tables
  const tableRegex = /\|([^\n]*)\|\n\|([^\n]*)\|\n((?:\|[^\n]*\|\n)*)/g;
  
  // Find all table matches in the text
  const matches = Array.from(text.matchAll(tableRegex));
  
  if (matches.length === 0) {
    return { content: text };
  }
  
  // Process the first table found
  const match = matches[0];
  const headerRow = match[1];
  const dataRows = match[3];
  
  // Extract headers
  const headers = headerRow.split('|')
    .map(header => header.trim())
    .filter(header => header !== '');
  
  // Extract data rows
  const rows = dataRows.split('\n')
    .filter(row => row.trim() !== '')
    .map(row => {
      return row.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '');
    });
  
  // Create table data
  const tableData: TableData = {
    headers,
    rows
  };
  
  // Remove the table from the content
  const tableStartIndex = text.indexOf(match[0]);
  const tableEndIndex = tableStartIndex + match[0].length;
  const contentBeforeTable = text.substring(0, tableStartIndex).trim();
  const contentAfterTable = text.substring(tableEndIndex).trim();
  
  // Combine content with appropriate spacing
  const content = [
    contentBeforeTable,
    contentAfterTable
  ].filter(Boolean).join('\n\n');
  
  return { content, table: tableData };
};

export function DocumentChat() {
  const [file, setFile] = useState<File | null>(null)
  const [_isProcessing, _setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB in bytes
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 50MB",
          duration: 2000
        })
        return
      }
      setFile(selectedFile)
      setMessages([]) // Clear chat when new file is uploaded
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF file",
        duration: 2000
      })
    }
  }

  const handleSendMessage = async () => {
    if (!file || !inputMessage.trim() || isLoading) return
  
    const userMessage = inputMessage.trim()
    setInputMessage("")
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)
    _setIsProcessing(true)
  
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('message', userMessage)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat-with-document`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${AuthService.getRdmTokens()?.tokens.token}`
        }
      })
  
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
  
      const data = await response.json()
      _setIsProcessing(false)
      
      // Parse the response to check for markdown tables
      const { content, table } = parseMarkdownTable(data.response);
      
      // Create a properly typed assistant message
      const assistantMessage: Message = { 
        role: 'assistant', 
        content
      }
      
      // Add the table if it exists (either from parsing or from the API response)
      if (table) {
        assistantMessage.table = table;
      } else if (data.table) {
        assistantMessage.table = data.table;
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      _setIsProcessing(false)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        duration: 2000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleBack = () => {
    navigate("/rdm/document-insights")
  }

  return (
    <div className="container mx-auto py-6 pr-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Document Chat</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload PDF
              </CardTitle>
              <CardDescription>
                Upload a PDF file to chat with its contents
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
                    disabled={isLoading}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Note: The chat tool may make mistakes and should be double-checked for accuracy.</p>
                  <p>Maximum file size: 50MB</p>
                  <p>Maximum page count: 1000 pages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
              <CardDescription>
                Ask questions about your document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-[500px]">
                <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {file ? "Ask a question about your document" : "Upload a PDF to start chatting"}
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' 
                            : 'bg-muted max-w-[80%]'
                        }`}
                      >
                        <div>{message.content}</div>
                        
                        {/* Display table if it exists */}
                        {message.table && (
                          <div className="mt-3 bg-background rounded-md overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {message.table.headers.map((header, i) => (
                                    <TableHead key={i}>{header}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {message.table.rows.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                      <TableCell key={cellIndex}>{cell}</TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="h-4 w-4" />
                      <span>Thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!file || isLoading}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!file || !inputMessage.trim() || isLoading}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}