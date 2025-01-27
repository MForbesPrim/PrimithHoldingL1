import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkle } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function HomePage() {
  // A simple boolean check to see if there's a token stored
  const isAuthenticated = Boolean(localStorage.getItem("token"))
  const loginPath = `${import.meta.env.VITE_PORTAL_URL}/login`
  // Example logout function: removes the token and redirects
  function handleLogout() {
    localStorage.removeItem("token")
    window.location.href = "/" // or use React Router's navigate
  }

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
                Primith
              </span>
            </Link>

            <div className="flex items-center gap-6">
              {/* Show Sign In if not logged in */}
              {!isAuthenticated && (
                <Link
                  to={loginPath}
                  className="hover:text-gray-400 text-gray-500 dark:text-gray-200 transition-colors font-bold"
                >
                  Sign In
                </Link>
              )}

              {/* Show Logout if logged in */}
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

              {/* Dark/Light Mode toggle (unchanged) */}
              <ModeToggle />
            </div>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200/10 to-gray-500/10" />
        <div className="container mx-auto px-4 relative">
          <Badge className="mb-4 text-gray-500" variant="outline">
            Innovation Solutions
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-gray-400 to-gray-900 text-transparent bg-clip-text leading-tight pb-2">
            Empowering Businesses
            <br />
            With Technology
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mb-8">
            Discover innovative technology solutions designed to optimize workflows, enhance productivity, and drive business growth.
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="hover:bg-gray-400 hover:text-white" asChild>
              <Link to="/shop">Services</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-400 text-gray-500 dark:text-white bg-transparent hover:bg-gray-400 hover:text-white"
              asChild
            >
              <Link to="/gallery">About Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS SECTION */}
      <section className="py-20 inset-0 bg-gradient-to-b from-gray-200/10 to-gray-500/10">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold tracking-tight text-center mb-12 text-gray-800 dark:text-gray-100">
            Featured Products
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Reporting */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Reporting
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Gain insights with advanced reporting tools tailored to your business needs. Simplify data analysis and decision-making.
              </p>
              <div className="mt-4">
                <Button asChild className="hover:bg-gray-400 hover:text-white">
                  <Link to="/reporting">Learn More</Link>
                </Button>
              </div>
            </div>
            {/* Financial Services */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Financial Services
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access innovative financial solutions to optimize your operations, improve cash flow, and drive business growth.
              </p>
              <div className="mt-4">
                <Button asChild className="hover:bg-gray-400 hover:text-white">
                  <Link to="/financial-services">Learn More</Link>
                </Button>
              </div>
            </div>
            {/* Consulting */}
            <div className="p-6 bg-white dark:bg-transparent border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Consulting
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Partner with experts to identify opportunities, overcome challenges, and implement solutions tailored to your goals.
              </p>
              <div className="mt-4">
                <Button asChild className="hover:bg-gray-400 hover:text-white">
                  <Link to="/consulting">Learn More</Link>
                </Button>
              </div>
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
