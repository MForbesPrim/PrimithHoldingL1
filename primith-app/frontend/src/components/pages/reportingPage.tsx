import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Sparkle, BarChart, PieChart, LineChart, Table2, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function ReportingPage() {
  const isAuthenticated = Boolean(localStorage.getItem("token"))
  const loginPath = `${import.meta.env.VITE_PORTAL_URL}/login`

  function handleLogout() {
    localStorage.removeItem("token")
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen dark:bg-black text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 backdrop-blur-sm top-0 w-full z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center justify-between">
            <Link
              to="/"
              className="text-2xl font-bold tracking-tighter flex items-center gap-2 text-gray-500 hover:text-gray-400"
            >
              <Sparkle className="w-5 h-5 mr-2" />
              <span className="bg-gradient-to-r from-gray-300 to-gray-700 text-transparent bg-clip-text">
                Primith
              </span>
            </Link>

            <div className="flex items-center gap-6">
              {!isAuthenticated && (
                <button
                  onClick={() => window.location.href = loginPath}
                  className="hover:text-gray-400 text-gray-500 dark:text-gray-200 transition-colors font-bold"
                >
                  Sign In
                </button>
              )}

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="hover:text-gray-400 text-gray-500 dark:text-gray-200 transition-colors font-bold"
                >
                  Logout
                </button>
              )}

              <Link
                to="/contact"
                className="hover:text-gray-400 text-gray-500 dark:text-gray-200 transition-colors font-bold"
              >
                Contact Us
              </Link>

              <ModeToggle />
            </div>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="py-12 bg-gradient-to-b from-gray-200/10 to-gray-500/10">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <Link to="/services" className="inline-flex items-center text-gray-500 hover:text-gray-400 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Services
            </Link>
            <div className="text-center">
              <Badge className="mb-4 text-gray-500" variant="outline">
                Reporting Solutions
              </Badge>
              <h1 className="text-5xl leading-tight font-bold tracking-tighter mb-4 bg-gradient-to-r from-gray-400 to-gray-900 text-transparent bg-clip-text">
                Advanced Analytics & Reporting Tools
              </h1>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12">
                Transform your data into actionable insights with our comprehensive reporting solutions.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <BarChart className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Custom Reports</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Create tailored reports that match your specific business requirements and KPIs.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Data Visualization</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Transform complex data into clear, insightful visualizations and interactive charts.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <LineChart className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">AI Insights</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Generate intelligent analysis and actionable insights from your documents and data using advanced AI.
                </p>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Table2 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Automated Reports</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Schedule and automate report generation and distribution to stakeholders.
              </p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Data-Driven Decisions</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400 text-sm">
                <li>• Make informed decisions based on accurate data</li>
                <li>• Identify trends and patterns in your business</li>
                <li>• Track progress towards business goals</li>
              </ul>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Improved Efficiency</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400 text-sm">
                <li>• Automate report generation and distribution</li>
                <li>• Reduce manual data processing time</li>
                <li>• Streamline reporting workflows</li>
              </ul>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <Button size="lg" className="hover:bg-gray-400 hover:text-white">
              Get Started with Reporting
            </Button>
          </div>
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