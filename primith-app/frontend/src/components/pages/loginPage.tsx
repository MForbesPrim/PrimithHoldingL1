import { SignIn } from "@clerk/clerk-react"
import { Sparkle } from "lucide-react"
import { Link } from "react-router-dom"

export function LoginPage() {
  return (
    <div className="flex items-center h-screen flex-col pt-20">
      <div className="flex mb-4">
        <Link to="/" className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors font-bold">
          <Sparkle size={40} />
        </Link>
      </div>
      <SignIn />
    </div>
  )
}