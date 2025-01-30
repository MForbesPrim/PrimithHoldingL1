import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sparkle, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import ReCAPTCHA from "react-google-recaptcha"
import axios from 'axios'
import {
 AlertDialog,
 AlertDialogContent, 
 AlertDialogDescription,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ContactPage() {
   const navigate = useNavigate()
   const [isLoading, setIsLoading] = useState(false)
   const [showSuccess, setShowSuccess] = useState(false)
   const [captchaValue, setCaptchaValue] = useState<string | null>(null)
   const [firstName, setFirstName] = useState("")
   const [lastName, setLastName] = useState("")
   const [email, setEmail] = useState("")
   const [phone, setPhone] = useState("")
   const [company, setCompany] = useState("")
   const [message, setMessage] = useState("")

   async function handleSubmit(e: React.FormEvent) {
       e.preventDefault();
       if (!captchaValue) {
           alert("Please complete the CAPTCHA");
           return;
       }
   
       setIsLoading(true);
       try {
           const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/contact`, {
               firstName,
               lastName,
               email,
               phone,
               company,
               message,
               captchaToken: captchaValue
           });
   
           if (response.status === 200) {
               setShowSuccess(true);
               setFirstName("");
               setLastName("");
               setEmail("");
               setPhone("");
               setCompany("");
               setMessage("");
           }
       } catch (error) {
           console.error('Error sending message:', error);
           alert('Failed to send message. Please try again.');
       } finally {
           setIsLoading(false);
       }
   }

   function handleCaptchaChange(value: string | null) {
       setCaptchaValue(value)
   }

   return (
       <>
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
                   <Button type="submit" className="mt-2" disabled={!captchaValue || isLoading}>
                       {isLoading ? (
                           <>
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                               Sending...
                           </>
                       ) : (
                           "Send Message"
                       )}
                   </Button>
                   <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        By submitting this form, you agree to our{" "}
                        <Link to="/terms-of-service" className="underline hover:text-gray-800 dark:hover:text-gray-200">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy-policy" className="underline hover:text-gray-800 dark:hover:text-gray-200">
                            Privacy Policy
                        </Link>
                   </div>
               </form>
           </div>

           <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
               <AlertDialogContent>
                   <AlertDialogTitle>Message Sent Successfully!</AlertDialogTitle>
                   <AlertDialogDescription>
                       Thank you for contacting us. We'll get back to you soon.
                   </AlertDialogDescription>
                   <Button 
                       onClick={() => {
                           setShowSuccess(false);
                           navigate('/');
                       }}
                   >
                       Close
                   </Button>
               </AlertDialogContent>
           </AlertDialog>
       </>
   )
}