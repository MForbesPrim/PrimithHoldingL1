import { Sparkle } from "lucide-react"
import { useEffect } from "react"
import { Link } from "react-router-dom"

export function TermsPage() {
useEffect(() => {
    window.scrollTo(0, 0)
    }, [])
 const TermsOfService = () => (
    <div className="max-w-2xl mx-auto px-6">
    <div className="prose prose-gray dark:prose-invert">
      <h2 className="text-3xl font-bold mb-6 text-center">Terms of Service</h2>
     <div className="space-y-6">
       <p className="text-sm text-muted-foreground">Last Updated: January 29, 2025</p>

       <section>
         <h3 className="text-xl font-semibold mb-3">Introduction</h3>
         <p className="text-gray-800 dark:text-gray-200">Welcome to Primith ("Company"), a diversified holding company operated by Primith Holdings Inc. ("we," "us," or "our"). Primith provides comprehensive business services, including financial services, reporting solutions, document management, consulting services, and technology solutions. These Terms of Service ("Terms") govern your use of all Primith services, platforms, and tools.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Scope of Services</h3>
         <p className="text-gray-800 dark:text-gray-200">Our services encompass Financial Services including investment management, financial planning, and advisory services; Business Consulting covering strategic planning, operational optimization, and professional guidance; Document Management providing secure storage, processing, and management of business documentation; Reporting Solutions delivering business intelligence, analytics, and customized reporting services; and Technology Solutions featuring AI-powered chatbots and automated business tools.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Eligibility and Account Requirements</h3>
         <p className="text-gray-800 dark:text-gray-200">You may only engage with Primith's services if you or your organization meet applicable regulatory requirements for financial services, you have legal authority to enter into binding agreements, you have authority to represent any entity on whose behalf you engage our services, and you comply with all applicable laws and regulations in your jurisdiction.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Service Terms and Conditions</h3>
         <div className="space-y-4">
           <p className="text-gray-800 dark:text-gray-200">Our financial services are provided in accordance with all applicable securities laws and regulations. Separate agreements and disclosures may apply to specific financial services.</p>
           <p className="text-gray-800 dark:text-gray-200">We maintain strict security protocols for document storage and management. By using our document management services, you grant us necessary permissions to store, process, and manage your documents according to agreed-upon service levels.</p>
           <p className="text-gray-800 dark:text-gray-200">Consulting engagements are governed by specific statements of work in addition to these Terms. We provide recommendations based on professional expertise, but ultimate business decisions remain your responsibility.</p>
           <p className="text-gray-800 dark:text-gray-200">Our technology platforms, including AI chatbots, are provided "as is." While we strive for accuracy, automated solutions should be used as tools to support, not replace, professional judgment.</p>
         </div>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Data Protection and Confidentiality</h3>
         <p className="text-gray-800 dark:text-gray-200">We maintain strict confidentiality of all client information and adhere to industry-standard security practices. Our handling of your information is detailed in our Privacy Policy, which is incorporated into these Terms by reference.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Professional Standards and Compliance</h3>
         <p className="text-gray-800 dark:text-gray-200">We maintain all necessary licenses and registrations for our service offerings. Our professional staff adheres to applicable industry standards and codes of conduct.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Fees and Payment</h3>
         <p className="text-gray-800 dark:text-gray-200">Service fees are established by separate fee schedules or engagement agreements. We reserve the right to modify our fee structure with appropriate notice.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Intellectual Property</h3>
         <p className="text-gray-800 dark:text-gray-200">We retain all intellectual property rights in our methodologies, processes, tools, and platforms. Client materials remain the property of the client unless otherwise specified. We grant you a limited license to use our platforms and tools for their intended business purposes. You grant us necessary licenses to process and store your information for service delivery.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Limitation of Liability</h3>
         <p className="text-gray-800 dark:text-gray-200">Our liability is limited to direct damages caused by our gross negligence or willful misconduct. We are not liable for consequential or indirect damages, losses resulting from market conditions or business decisions, technology platform downtime or errors, or third-party service provider actions.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Termination</h3>
         <p className="text-gray-800 dark:text-gray-200">Either party may terminate services with appropriate notice as specified in relevant service agreements. Upon termination, you must settle outstanding fees and we will ensure orderly transfer of materials and data.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Governing Law</h3>
         <p className="text-gray-800 dark:text-gray-200">These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in courts of competent jurisdiction in said territory.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Professional Disclaimer</h3>
         <p className="text-gray-800 dark:text-gray-200">Our services provide professional guidance but do not guarantee specific outcomes. Financial services involve risk, and past performance does not guarantee future results.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Modifications</h3>
         <p className="text-gray-800 dark:text-gray-200">We may update these Terms periodically. Continued use of our services constitutes acceptance of modified Terms.</p>
       </section>

       <section>
         <h3 className="text-xl font-semibold mb-3">Contact Information</h3>
         <p className="text-gray-800 dark:text-gray-200">For questions about these Terms or our services, please contact: support@primith.com</p>
       </section>

       <p className="text-sm text-muted-foreground mt-8">These Terms constitute the basic agreement between Primith Holdings Inc. and its clients. Additional terms may apply to specific services or engagements.</p>
       </div>
     </div>
   </div>
 )

 return (
    <div className="container mx-auto py-20">
      <div className="flex justify-center mb-8">
        <Link to="/" className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors">
          <Sparkle size={40} />
        </Link>
      </div>
      <TermsOfService />
    </div>
  )
 }