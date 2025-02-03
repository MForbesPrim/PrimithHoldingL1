import { useState } from "react"
import AuthService from '@/services/auth'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
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
import { Search, Loader2, Copy, BotMessageSquare } from "lucide-react"
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

interface ChatBotProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function ChatBot({ isOpen, setIsOpen }: ChatBotProps) {
  const { toast } = useToast()
    const [question, setQuestion] = useState("")
    const [response, setResponse] = useState<ChatResponse | null>(null)
    const [loading, setLoading] = useState(false)

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

    const handleSheetOpenChange = (open: boolean) => {
      setIsOpen(open)
      if (!open) {
          setQuestion("")
          setResponse(null)
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
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <BotMessageSquare className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] h-[95vh] mt-[5vh] !rounded-none !rounded-tl-lg overflow-y-auto [&>button]:focus:ring-gray-200">
            <SheetHeader>
                  <SheetTitle>Primith Chat</SheetTitle>
                  <SheetDescription className="text-xs">
                      Get instant help with navigation, features, and common tasks. Ask about any Primith Portal functionality.
                  </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                    <Textarea
                        id="question"
                        placeholder="What would you like to know?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="min-h-[100px]"
                    />
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

                    {/* Response Section */}
                    {response && (
                        <div className="mt-6">
                            <div className="space-y-4">
                                <div className="prose dark:prose-invert max-w-none text-sm">
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
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}