// src/context/OrganizationProvider.tsx
import React, { createContext, useState, useContext, useEffect } from "react"
import AuthService from "@/services/auth"
import { Organization } from "@/types/document"

interface OrganizationContextType {
  organizations: Organization[]
  selectedOrgId: string
  isSuperAdmin: boolean
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>
  setSelectedOrgId: (id: string) => void
  setIsSuperAdmin: React.Dispatch<React.SetStateAction<boolean>>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // On mount, check if the user is super admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const adminStatus = await AuthService.isSuperAdmin()
        setIsSuperAdmin(adminStatus)
      } catch (err) {
        console.error("Failed to check admin status:", err)
      }
    }
    checkAdmin()
  }, [])

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrgId,
        isSuperAdmin,
        setOrganizations,
        setSelectedOrgId,
        setIsSuperAdmin,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider")
  }
  return context
}
