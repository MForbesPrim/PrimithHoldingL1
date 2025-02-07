import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface Navigation {
   currentSection: string;
   setCurrentSection: (section: string) => void;
}

const NavigationContext = createContext<Navigation | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
 const [currentSection, setCurrentSection] = useState(() => {
   // Initialize from localStorage or default to 'Dashboard'
   return localStorage.getItem('currentSection') || 'Dashboard'
 })

 // Update localStorage when currentSection changes
 useEffect(() => {
   localStorage.setItem('currentSection', currentSection)
 }, [currentSection])

 const value: Navigation = {
   currentSection,
   setCurrentSection
 }

 return (
   <NavigationContext.Provider value={value}>
     {children}
   </NavigationContext.Provider>
 )
}

export function useNavigation(): Navigation {
 const context = useContext(NavigationContext)
 if (context === undefined) {
   throw new Error('useNavigation must be used within a NavigationProvider')
 }
 return context
}