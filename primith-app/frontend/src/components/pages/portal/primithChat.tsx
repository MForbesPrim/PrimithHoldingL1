import { useState } from "react"
import AuthService from '@/services/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Switch } from "@/components/ui/switch"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
  } from "@/components/ui/hover-card"
import { 
    Copy, 
    InfoIcon } from "lucide-react"

import {
  Search,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CodeBlock {
    language: string;
    content: string;
}

interface ChatResponse {
    response: string;
    code?: CodeBlock;
    table?: {
        headers: string[];
        rows: string[][];
    };
}

export function ConsultantDashboard() {
    const { toast } = useToast()
    const [question, setQuestion] = useState("")
    const [response, setResponse] = useState<ChatResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [includeRDM, setIncludeRDM] = useState(false)

    const handleSubmit = async () => {
        setLoading(true)
        try {
          const result = await AuthService.sendChatMessage(question)
          setResponse(result)
          console.log(result)
        } catch (error) {
          console.error('Error:', error)
        } finally {
          setLoading(false)
        }
      }

      const handleCopyCode = () => {
        if (response?.code) {
            navigator.clipboard.writeText(response.code.content)
            toast({
                title: "Code copied!",
                description: "The code has been copied to your clipboard.",
                duration: 2000
            })
        }
    }

  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-8">
        {/* Input Section */}
        <Card>
        <CardHeader className="pt-6 pb-0">
        <CardTitle>Primith Chat</CardTitle>
        <CardDescription className="space-y-1">
            <p>Ask questions using natural language and get AI-powered responses.</p>
        </CardDescription>
        </CardHeader>
        <div className="px-6 py-3 border-b">
        <div className="flex items-center justify-between">
            <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <Switch
                checked={includeRDM}
                onCheckedChange={setIncludeRDM}
                id="rdm-mode"
                />
                <label
                htmlFor="rdm-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                Include RDM PDFs
                </label>
                <HoverCard>
                <HoverCardTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                    <p className="text-sm">
                    Newly uploaded files may take a few minutes to be processed before they can be included in response context
                    </p>
                </HoverCardContent>
                </HoverCard>
            </div>
            </div>
        </div>
        </div>
        <CardContent className="space-y-4">
            <div className="space-y-2 pt-4">
            <Textarea
                id="question"
                placeholder="What would you like to know?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[100px]"
            />
            </div>
        </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleSubmit}
              disabled={loading || !question}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Response Section */}
        {response && (
        <Card>
            <CardHeader>
            <CardTitle>Response</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
                <div className="prose dark:prose-invert max-w-none">
                <p>{response.response}</p>
                </div>

                {response.table && (
                <Table>
                    <TableHeader>
                    <TableRow>
                        {response.table.headers.map((header, i) => (
                        <TableHead key={i}>{header}</TableHead>
                        ))}
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {response.table.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                )}

                {response?.code && (
                <div className="rounded-lg overflow-hidden">
                    <div className="flex justify-end p-2">
                        <Button
                            variant="ghost"
                            onClick={handleCopyCode}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Code
                        </Button>
                    </div>
                    <SyntaxHighlighter 
                        language={response.code.language}
                        style={dracula}
                    >
                        {response.code.content}
                    </SyntaxHighlighter>
                </div>
            )}
            </div>
            </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}