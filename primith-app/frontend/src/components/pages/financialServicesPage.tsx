import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Sparkle, ArrowLeft, PiggyBank, TrendingUp, ShieldCheck, BarChart3 } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function FinancialServicesPage() {
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
                Financial Solutions
              </Badge>
              <h1 className="text-5xl leading-tight font-bold tracking-tighter mb-4 bg-gradient-to-r from-gray-400 to-gray-900 text-transparent bg-clip-text">
                Optimize Your Financial Operations
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
                Streamline your financial processes and make informed decisions with our comprehensive financial services.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Financial Planning</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Develop comprehensive financial strategies aligned with your business goals.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Investment Strategy</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Optimize your investment portfolio with data-driven strategies and expert guidance.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Risk Management</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Identify and mitigate financial risks with comprehensive risk assessment tools.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Performance Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Track and analyze financial performance with advanced analytics tools.
              </p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Expert Team</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400 text-sm">
                <li>• Experienced financial advisors</li>
                <li>• Industry-specific expertise</li>
                <li>• Ongoing support and guidance</li>
              </ul>
            </div>

            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Tailored Solutions</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400 text-sm">
                <li>• Customized financial strategies</li>
                <li>• Flexible service options</li>
                <li>• Scalable solutions for growth</li>
              </ul>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <Button size="lg" className="hover:bg-gray-400 hover:text-white">
              Schedule a Consultation
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