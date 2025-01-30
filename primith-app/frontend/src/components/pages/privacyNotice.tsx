import { Sparkle } from "lucide-react"
import { Link } from "react-router-dom"

export function PrivacyPage() {
  const PrivacyPolicy = () => (
    <div className="max-w-2xl mx-auto px-6">
    <div className="prose prose-gray dark:prose-invert">
      <h2 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h2>
      <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Last Updated: January 29, 2025</p>

        <section>
          <h3 className="font-bold">Introduction</h3>
          <p>This Privacy Policy outlines how Primith Holdings Inc. collects, uses, and protects information in our financial services, consulting, document management, and technology operations. We are committed to protecting your privacy and ensuring data security.</p>
        </section>

        <section>
          <h3 className="font-bold">Information Collection</h3>
          <p>We collect business and personal information necessary for service delivery, including contact details, financial information, business records, and service usage data. Collection methods include direct submission, service interactions, and automated tools.</p>
        </section>

        <section>
          <h3 className="font-bold">Information Usage</h3>
          <p>Collected information is used for service delivery, regulatory compliance, business operations, communication, and service improvement. We maintain strict data handling protocols aligned with industry standards.</p>
        </section>

        <section>
          <h3 className="font-bold">Data Security</h3>
          <p>We implement comprehensive security measures including encryption, access controls, and monitoring systems. Our security protocols are regularly reviewed and updated to maintain data protection.</p>
        </section>

        <section>
          <h3 className="font-bold">Information Sharing</h3>
          <p>Client information is shared only as necessary for service delivery, regulatory compliance, or with explicit consent. We do not sell or trade personal information to third parties.</p>
        </section>

        <section>
          <h3 className="font-bold">Data Retention</h3>
          <p>We retain information as required by law and business needs. When information is no longer needed, it is securely deleted according to our data retention policies.</p>
        </section>

        <section>
          <h3 className="font-bold">Your Rights</h3>
          <p>You have rights to access, correct, and request deletion of your information. Contact us to exercise these rights or discuss data privacy concerns.</p>
        </section>

        <section>
          <h3 className="font-bold">Updates to Policy</h3>
          <p>This policy may be updated periodically. Significant changes will be communicated to clients and updated on our platforms.</p>
        </section>
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
      <PrivacyPolicy />
    </div>
  )
 }