import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
 return (
   <div className="flex flex-col items-center h-screen space-y-6 text-center px-4 mt-52">
     <h1 className="text-8xl font-bold text-gray-900 dark:text-gray-100">404</h1>
     <div className="space-y-3">
       <h2 className="text-3xl font-semibold">Page Not Found</h2>
       <p className="text-muted-foreground">
         The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
       </p>
     </div>
     <Button asChild size="lg">
       <Link to="/">Return to Home</Link>
     </Button>
   </div>
 )
}