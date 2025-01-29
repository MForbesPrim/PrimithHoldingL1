import { useState, useEffect } from 'react'
import { Shield, Users, Building2, Briefcase, Package } from 'lucide-react'
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Link } from 'react-router-dom'
import AuthService from '@/services/auth'

export function AdminNav() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check stored admin status first
    const storedStatus = AuthService.getCachedAdminStatus()
    setIsAdmin(storedStatus)

    // Optionally verify with server
    const verifyAdmin = async () => {
      const adminStatus = await AuthService.isSuperAdmin()
      setIsAdmin(adminStatus)
    }
    verifyAdmin()
  }, [])

  if (!isAdmin) return null

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer text-xs flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          <span>Admin</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <Link to="/admin/users">
            <DropdownMenuItem className="cursor-pointer text-xs flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>Users</span>
            </DropdownMenuItem>
          </Link>
          
          <Link to="/admin/organizations">
            <DropdownMenuItem className="cursor-pointer text-xs flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              <span>Organizations</span>
            </DropdownMenuItem>
          </Link>
          
          <Link to="/admin/roles">
            <DropdownMenuItem className="cursor-pointer text-xs flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              <span>Roles</span>
            </DropdownMenuItem>
          </Link>
          
          <Link to="/admin/services">
            <DropdownMenuItem className="cursor-pointer text-xs flex items-center">
              <Package className="w-4 h-4 mr-2" />
              <span>Services</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
    </>
  )
}