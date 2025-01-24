import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkle } from "lucide-react"
import { Link } from "react-router-dom"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // Prevent form reload
    navigate("/") // Navigate to home immediately
  }

  return (
    <div className="flex items-center h-screen flex-col pt-20">
    <div className="flex mb-4">
      <Link to="/" className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors font-bold">
        <Sparkle size={40} />
      </Link>
    </div>
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-6 rounded shadow w-full max-w-sm bg-transparent border"
    >
        <h1 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-100">
          Login
        </h1>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className=" dark:text-gray-100 bg-transparent hover:bg-muted"
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className=" dark:text-gray-100 bg-transparent hover:bg-muted"
        />

        <Button type="submit" className="mt-2">
          Sign In
        </Button>
      </form>
    </div>
  )
}
