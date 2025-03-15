import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Sparkle } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function ServicesPage() {
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

      {/* SERVICES SECTION WITH INTEGRATED HERO */}
      <section className="py-12 bg-gradient-to-b from-gray-200/10 to-gray-500/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 text-gray-500" variant="outline">
              Our Services
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-gray-400 to-gray-900 text-transparent bg-clip-text">
              Comprehensive Solutions For Your Business
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
              Explore our range of services designed to help your business thrive in the digital age.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Reporting Service */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Reporting
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                Generate deep insights into your business data, enabling informed decision-making.
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-sm mb-6 list-disc list-inside space-y-2">
                <li>Custom report generation</li>
                <li>Real-time data analytics</li>
                <li>Interactive dashboards</li>
                <li>Automated reporting</li>
              </ul>
              <Button asChild className="w-full hover:bg-gray-400 hover:text-white">
                <Link to="/reporting">Learn More</Link>
              </Button>
            </div>

            {/* Financial Services */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Financial Services
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                Optimize your operations with our comprehensive suite of financial services and solutions.
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-sm mb-6 list-disc list-inside space-y-2">
                <li>Financial planning</li>
                <li>Cash flow optimization</li>
                <li>Investment strategies</li>
                <li>Risk management</li>
              </ul>
              <Button asChild className="w-full hover:bg-gray-400 hover:text-white">
                <Link to="/financial-services">Learn More</Link>
              </Button>
            </div>

            {/* Consulting Services */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Consulting
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                Get expert guidance and strategic advice to overcome challenges and achieve your goals.
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-sm mb-6 list-disc list-inside space-y-2">
                <li>Business strategy</li>
                <li>Process optimization</li>
                <li>Technology solutions</li>
                <li>Change management</li>
              </ul>
              <Button asChild className="w-full hover:bg-gray-400 hover:text-white">
                <Link to="/consulting">Learn More</Link>
              </Button>
            </div>

            {/* Pro Services */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Primith Pro
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                Professional services and custom solutions tailored to your unique business requirements.
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-sm mb-6 list-disc list-inside space-y-2">
                <li>Custom development</li>
                <li>System integration</li>
                <li>Solution architecture</li>
                <li>Process automation</li>
              </ul>
              <Button asChild className="w-full hover:bg-gray-400 hover:text-white">
                <Link to="/pro">Learn More</Link>
              </Button>
            </div>
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