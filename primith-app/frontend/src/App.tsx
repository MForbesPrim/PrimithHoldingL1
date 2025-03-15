import "./App.css"
import { Routes, Route } from "react-router-dom"
import { lazy, Suspense } from 'react'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { useTokenRefresh } from './hooks/useTokenRefresh'

// Core components loaded immediately
import { LoginPage } from "@/components/pages/loginPage"
import { AuthRedirect } from "@/redirect"
import { ProtectedRoute } from "@/components/protectedRoute"
import { ProtectedLayout } from '@/protectedLayout'

// Lazy loaded components with named exports
const HomePage = lazy(() => import("@/components/pages/homePage").then(module => ({ default: module.HomePage })))
const ContactPage = lazy(() => import("@/components/pages/contactUsPage").then(module => ({ default: module.ContactPage })))
const PrivacyPage = lazy(() => import("@/components/pages/privacyNotice").then(module => ({ default: module.PrivacyPage })))
const TermsPage = lazy(() => import("@/components/pages/termsOfService").then(module => ({ default: module.TermsPage })))
const ProtectedPage = lazy(() => import("@/components/pages/protectedPage").then(module => ({ default: module.ProtectedPage })))
const PortalHomePage = lazy(() => import("@/components/pages/portal/portalHomePage").then(module => ({ default: module.PortalHomePage })))
const NotFoundPage = lazy(() => import("@/components/pages/notFoundPage").then(module => ({ default: module.NotFoundPage })))
const HelpPage = lazy(() => import("@/components/pages/helpCenterPage").then(module => ({ default: module.HelpPage })))
const MainServicesPage = lazy(() => import("@/components/pages/servicesPage").then(module => ({ default: module.ServicesPage })))
const AboutUsPage = lazy(() => import("@/components/pages/aboutUsPage").then(module => ({ default: module.AboutUsPage })))
const ReportingPage = lazy(() => import("@/components/pages/reportingPage").then(module => ({ default: module.ReportingPage })))
const FinancialServicesPage = lazy(() => import("@/components/pages/financialServicesPage").then(module => ({ default: module.FinancialServicesPage })))
const ConsultingPage = lazy(() => import("@/components/pages/consultingPage").then(module => ({ default: module.ConsultingPage })))
const ProServicesPage = lazy(() => import("@/components/pages/proServicesPage").then(module => ({ default: module.ProServicesPage })))

// Admin routes
const AdminLayout = lazy(() => import("@/components/pages/admin/adminLayout").then(module => ({ default: module.AdminLayout })))
const UsersPage = lazy(() => import("@/components/pages/admin/usersPage").then(module => ({ default: module.UsersPage })))
const OrganizationsPage = lazy(() => import("@/components/pages/admin/organizationsPage").then(module => ({ default: module.OrganizationsPage })))
const RolesPage = lazy(() => import("@/components/pages/admin/rolesPage").then(module => ({ default: module.RolesPage })))
const ServicesPage = lazy(() => import("@/components/pages/admin/servicesPage").then(module => ({ default: module.ServicesPage })))

// RDM routes
const ProtectedRdmLayout = lazy(() => import("@/components/pages/rdm/layouts/protected-rdm-layout").then(module => ({ default: module.ProtectedRdmLayout })))
const RdmHomePage = lazy(() => import("@/components/pages/rdm/rdmHomePage").then(module => ({ default: module.RdmHomePage })))
const ProjectsPage = lazy(() => import("@/components/pages/rdm/projects/projectsDashboard").then(module => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() => import("@/components/pages/rdm/projects/projectDetails").then(module => ({ default: module.ProjectDetailPage })))
const PagesDashboard = lazy(() => import("@/components/pages/rdm/pages/pagesDashboard").then(module => ({ default: module.PagesDashboard })))
const CreateTemplate = lazy(() => import("@/components/pages/rdm/pages/pagesCreateTemplate").then(module => ({ default: module.CreateTemplate })))
const EditTemplate = lazy(() => import("@/components/pages/rdm/pages/pagesEditTemplate").then(module => ({ default: module.EditTemplate })))
const DocumentManagementPage = lazy(() => import("@/components/pages/rdm/documentManagement/dmDashboard").then(module => ({ default: module.DocumentManagementPage })))

// Loading component
const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
)

function App() {
  useTokenRefresh()

  const domain = window.location.hostname
  const isPortal = domain === 'portal.primith.com' || domain === 'portal.localhost'
  const isSupport = domain === 'support.primith.com' || domain === 'support.localhost'

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex h-screen w-screen">
        <div className="flex flex-1 flex-col">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {isSupport ? (
                <Route path="/" element={<HelpPage />} />
              ) : isPortal ? (
                <>
                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={
                      <ProtectedRoute>
                        <PortalHomePage />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route path="users" element={<Suspense fallback={<LoadingSpinner />}><UsersPage /></Suspense>} />
                      <Route path="organizations" element={<Suspense fallback={<LoadingSpinner />}><OrganizationsPage /></Suspense>} />
                      <Route path="roles" element={<Suspense fallback={<LoadingSpinner />}><RolesPage /></Suspense>} />
                      <Route path="services" element={<Suspense fallback={<LoadingSpinner />}><ServicesPage /></Suspense>} />
                    </Route>
                  </Route>
                  <Route element={<ProtectedRdmLayout />}>
                    <Route path="/rdm" element={<RdmHomePage />} />
                    <Route path="/rdm/projects" element={<ProjectsPage />} />
                    <Route path="/rdm/projects/:projectId" element={<ProjectDetailPage />} />
                    <Route path="/rdm/pages" element={<PagesDashboard />} />
                    <Route path="/rdm/pages/templates" element={<PagesDashboard />} />
                    <Route path="/rdm/document-management" element={<DocumentManagementPage />} />
                    <Route path="/rdm/create-template" element={<CreateTemplate />} />
                    <Route path="/rdm/pages/templates/edit/:id" element={<EditTemplate />} />
                  </Route>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
                  <Route path="*" element={<NotFoundPage />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPage />} />
                  <Route path="/terms-of-service" element={<TermsPage />} />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
                  <Route path="/protected" element={<ProtectedPage />} />
                  <Route path="/services" element={<MainServicesPage />} />
                  <Route path="/about-us" element={<AboutUsPage />} />
                  <Route path="/reporting" element={<ReportingPage />} />
                  <Route path="/financial-services" element={<FinancialServicesPage />} />
                  <Route path="/consulting" element={<ConsultingPage />} />
                  <Route path="/pro" element={<ProServicesPage />} />
                  <Route element={<ProtectedLayout />}>
                    <Route path="/portal" element={
                      <ProtectedRoute>
                        <PortalHomePage />
                      </ProtectedRoute>
                    } />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </>
              )}
            </Routes>
          </Suspense>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  )
}

export default App