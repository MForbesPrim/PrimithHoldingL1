import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import { Sparkle, Users, Target, Lightbulb, Shield } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export function AboutUsPage() {
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

      {/* ABOUT US HERO */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200/10 to-gray-500/10" />
        <div className="container mx-auto px-4 relative">
          <Badge className="mb-4 text-gray-500" variant="outline">
            About Us
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-gray-400 to-gray-900 text-transparent bg-clip-text leading-tight pb-2">
            Driving Innovation
            <br />
            Through Technology
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mb-8">
            At Primith, we're dedicated to empowering businesses with cutting-edge technology solutions that drive growth and success.
          </p>
        </div>
      </section>

      {/* OUR STORY SECTION */}
      <section className="py-20 bg-gradient-to-b from-gray-200/10 to-gray-500/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-6 text-gray-800 dark:text-gray-100">
              Our Story
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Founded with a vision to transform how businesses leverage technology, Primith has grown into a trusted partner for organizations seeking innovative solutions. Our journey is marked by continuous innovation, unwavering commitment to excellence, and a deep understanding of our clients' needs.
            </p>
          </div>
        </div>
      </section>

      {/* VALUES SECTION */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold tracking-tight text-center mb-12 text-gray-800 dark:text-gray-100">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Client Focus</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We put our clients first, understanding their unique needs and delivering tailored solutions.
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Target className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Excellence</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We strive for excellence in everything we do, setting high standards and exceeding expectations.
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Innovation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We embrace innovation and continuously explore new technologies to solve complex challenges.
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Shield className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Integrity</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We operate with the highest level of integrity, building trust through transparency and accountability.
              </p>
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