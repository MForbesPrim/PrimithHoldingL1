import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // Prevent form reload
    navigate("/") // Navigate to home immediately
  }

  return (
    <div className="flex justify-center items-center">
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
