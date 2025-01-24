import { Sparkle } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PrivacyPage() {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)

  const PrivacyPolicy = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
        <div className="space-y-4">
          <p>Last Updated: January 24, 2025</p>
          
          <section>
            <h3 className="font-bold">Introduction</h3>
            <p>This Privacy Policy describes how Primith collects, uses, and protects the personal information you provide when using our consulting and software services. We are committed to protecting your privacy and ensuring the security of your personal information.</p>
          </section>

          <section>
            <h3 className="font-bold">Information We Collect</h3>
            <p>We collect the following personal information when you engage with our services: full name, email address, phone number, physical address, and payment information.</p>
          </section>

          <section>
            <h3 className="font-bold">How We Use Your Information</h3>
            <p>We use the information we collect exclusively for internal business purposes, including: providing and maintaining our consulting and software services, processing payments and managing billing, communicating with you about our services, and improving our service quality and user experience.</p>
          </section>

          <section>
            <h3 className="font-bold">Cookie Usage</h3>
            <p>We use session cookies solely to enhance your user experience and maintain your session while using our services. These cookies do not track personal information and are deleted when you close your browser.</p>
          </section>

          <section>
            <h3 className="font-bold">Data Security</h3>
            <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          </section>

          <section>
            <h3 className="font-bold">Third-Party Disclosure</h3>
            <p>We do not sell, trade, or otherwise transfer your personal information to external parties. Your information remains strictly within our organization for business operations purposes.</p>
          </section>

          <section>
            <h3 className="font-bold">Children's Privacy</h3>
            <p>Our services are not directed to individuals under the age of 13, and we do not knowingly collect personal information from children under 13 years of age.</p>
          </section>

          <section>
            <h3 className="font-bold">Your Rights</h3>
            <p>You have the right to: access your personal information, request corrections to your data, request deletion of your data, opt-out of communications, and receive a copy of your data.</p>
          </section>

          <button 
            onClick={() => setShowPrivacyPolicy(false)}
            className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex items-center h-screen flex-col pt-20">
      <div className="flex mb-4">
        <Link to="/" className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors font-bold">
          <Sparkle size={40} />
        </Link>
      </div>
      {showPrivacyPolicy && <PrivacyPolicy />}
      {!showPrivacyPolicy && (
        <>
        <button 
          onClick={() => setShowPrivacyPolicy(true)}
          className="mt-4 text-sm text-gray-600 dark:text-gray-400 hover:underline"
        >
          Click To View Privacy Policy
        </button>
        <Button className="hover:bg-gray-400 hover:text-white mt-4" asChild>
            <Link to="/">Back To Home</Link>
        </Button>
        </>
      )}
    </div>
  )
}