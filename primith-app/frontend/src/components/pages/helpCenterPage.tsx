import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Sparkle } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function HelpPage() {
    return (
        <div className="min-h-screen dark:bg-black text-white">
            {/* HEADER */}
            <header className="border-b border-white/10 backdrop-blur-sm top-0 w-full z-50">
                <div className="container mx-auto px-4 py-4">
                    <nav className="flex items-center justify-between">
                        <Link
                            to="/"
                            className="text-2xl font-bold tracking-tighter flex items-center gap-2 text-gray-500 hover:text-gray-400"
                        >
                            <Sparkle className="w-5 h-5 mr-2" />
                            <span className="bg-gradient-to-r from-gray-300 to-gray-700 text-transparent bg-clip-text">
                                Primith Support
                            </span>
                        </Link>

                        <div className="flex items-center gap-6">
                            <ModeToggle />
                        </div>
                    </nav>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="pt-10 pb-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-200/10 to-gray-500/10" />
                <div className="container mx-auto px-4 relative">
                    <Badge className="mb-4 text-gray-500" variant="outline">
                        Help Center
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-gray-400 to-gray-900 text-transparent bg-clip-text leading-tight pb-2">
                        How can we help?
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mb-8">
                        Find answers to common questions and learn how to make the most of Primith's services.
                    </p>
                </div>
            </section>

            {/* HELP CONTENT */}
            <section className="py-20 inset-0 bg-gradient-to-b from-gray-200/10 to-gray-500/10">
                <div className="container mx-auto px-4">
                    <Tabs defaultValue="getting-started" className="w-full">
                        <TabsList className="grid w-full grid-cols-5 mb-8">
                            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
                            <TabsTrigger value="navigation">Navigation</TabsTrigger>
                            <TabsTrigger value="features">Features</TabsTrigger>
                            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
                            <TabsTrigger value="faq">FAQ</TabsTrigger>
                        </TabsList>

                    {/* Getting Started Section */}
                    <TabsContent value="getting-started">
                    <Card>
                        <CardHeader>
                            <CardTitle>Welcome to Primith Portal</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <h3 className="text-lg font-semibold">Portal Overview</h3>
                            <p>The Primith Portal provides a centralized hub to access all Primith applications and services. Key features include:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Apps Menu for quick access to all Primith services</li>
                                <li>AI-powered Chat Assistant for instant help</li>
                                <li>Notification system for important updates</li>
                                <li>Customizable theme settings</li>
                                <li>Profile and account management</li>
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Navigation Guide */}
                <TabsContent value="navigation">
                    <Card>
                        <CardHeader>
                            <CardTitle>Portal Navigation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Apps Menu</h3>
                                <p>Access the Apps Menu by clicking the grid icon in the top-left corner. Available applications include:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Primith RDM - Reporting and Document Management</li>
                                    <li>Primith Financing - Financial Services</li>
                                    <li>Primith Consulting - Professional Services</li>
                                    <li>Primith Pro - Advanced Features</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">Top Navigation Bar</h3>
                                <p>The top navigation bar contains:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Chat Assistant - Get instant help with any questions</li>
                                    <li>Notifications - View important updates and alerts</li>
                                    <li>Account Settings - Access profile and preferences</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Features Guide */}
                <TabsContent value="features">
                    <Card>
                        <CardHeader>
                            <CardTitle>Portal Features</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Chat Assistant</h3>
                                <p>The AI-powered Chat Assistant helps you:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Get instant answers to your questions</li>
                                    <li>Navigate the portal efficiently</li>
                                    <li>Understand features and functionality</li>
                                    <li>Troubleshoot common issues</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">Theme Customization</h3>
                                <p>Customize your portal experience:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Switch between Light and Dark themes</li>
                                    <li>Access theme settings through the account menu</li>
                                    <li>Theme preferences are saved automatically</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tutorial Section */}
                <TabsContent value="tutorials">
                    <Card>
                        <CardHeader>
                            <CardTitle>Step-by-Step Tutorials</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Using the Chat Assistant</h3>
                                <ol className="list-decimal pl-6 space-y-2">
                                    <li>Click the chat icon in the top navigation bar</li>
                                    <li>Type your question in the input box</li>
                                    <li>Click Send or press Enter</li>
                                    <li>Review the AI response</li>
                                    <li>Copy any provided code snippets if needed</li>
                                </ol>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">Changing Theme</h3>
                                <ol className="list-decimal pl-6 space-y-2">
                                    <li>Click your profile picture in the top-right</li>
                                    <li>Navigate to Settings &gt; Theme</li>
                                    <li>Select Light or Dark mode</li>
                                    <li>Theme changes apply immediately</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FAQ Section */}
                <TabsContent value="faq">
                    <Card>
                        <CardHeader>
                            <CardTitle>Frequently Asked Questions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold">How do I access different applications?</h3>
                                    <p>Use the Apps Menu (grid icon) in the top-left corner to switch between applications.</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold">How do I use the Chat Assistant?</h3>
                                    <p>Click the chat icon in the top navigation, type your question, and click Send.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold">Can I customize the portal's appearance?</h3>
                                    <p>Yes, you can switch between Light and Dark themes through the account settings menu.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold">Where can I find my notifications?</h3>
                                    <p>Click the bell icon in the top navigation bar to view your notifications.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-8 border-t border-white/10">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center gap-2 mb-4 md:mb-0">
                            <Sparkle className="w-5 h-5 text-gray-500 hover:text-gray-400" />
                            <span className="font-bold text-gray-500">Primith</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                            <Link
                                to="/terms-of-service"
                                className="hover:text-gray-400 text-gray-500 dark:text-gray-200 transition-colors text-xs mr-4"
                            >
                                Terms
                            </Link>
                            <Link
                                to="/privacy-policy"
                                className="hover:text-gray-400 text-gray-500 dark:text-gray-200 transition-colors text-xs mr-4"
                            >
                                Privacy Policy
                            </Link>
                            © {new Date().getFullYear()} Primith Holdings. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}