import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sparkle } from "lucide-react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import ReCAPTCHA from "react-google-recaptcha"

export function ContactPage() {
    const navigate = useNavigate()
    const [captchaValue, setCaptchaValue] = useState<string | null>(null)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [company, setCompany] = useState("")
    const [message, setMessage] = useState("")

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!captchaValue) {
            alert("Please complete the CAPTCHA")
            return
        }
        navigate("/")
    }

    function handleCaptchaChange(value: string | null) {
        setCaptchaValue(value)
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
            Contact Us
            </h1>

            <Input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="dark:text-gray-100 bg-transparent hover:bg-muted"
            />

            <Input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="dark:text-gray-100 bg-transparent hover:bg-muted"
            />

            <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="dark:text-gray-100 bg-transparent hover:bg-muted"
            />

            <Input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="dark:text-gray-100 bg-transparent hover:bg-muted"
            />

            <Input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="dark:text-gray-100 bg-transparent hover:bg-muted"
            />

            <Textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="dark:text-gray-100 bg-transparent hover:bg-muted min-h-[100px]"
            />
        <div className="w-full flex justify-center">
            <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
                className="mt-4"
            />
        </div>
        <Button type="submit" className="mt-2" disabled={!captchaValue}>
            Send Message
        </Button>
        </form>
        </div>
    )
}