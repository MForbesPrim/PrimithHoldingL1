import "./App.css"
import { Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster";
import { useTokenRefresh } from './hooks/useTokenRefresh';

import { HomePage } from "@/components/pages/homePage"
import { LoginPage } from "@/components/pages/loginPage"
import { ContactPage } from "@/components/pages/contactUsPage"
import { PrivacyPage } from "@/components/pages/privacyNotice"
import { TermsPage } from "@/components/pages/termsOfService"
import { AuthRedirect } from "@/redirect"
import { ProtectedPage } from "@/components/pages/protectedPage"
import { PortalHomePage } from "@/components/pages/portal/portalHomePage"
import { ProtectedRoute } from "@/components/protectedRoute"
import { ProtectedLayout } from '@/protectedLayout';
import { AdminLayout } from "@/components/pages/admin/adminLayout"
import { UsersPage } from "@/components/pages/admin/usersPage"
import { OrganizationsPage } from "@/components/pages/admin/organizationsPage"
import { RolesPage } from "@/components/pages/admin/rolesPage"
import { ServicesPage } from "@/components/pages/admin/servicesPage"
import { AdministrationPage } from "@/components/pages/admin/settings/AdministrationPage"
import { LicensingPage } from "@/components/pages/admin/settings/LicensingPage"
import { BillingPage } from "@/components/pages/admin/settings/BillingPage"
import { NotFoundPage } from "@/components/pages/notFoundPage" 
import { RdmHomePage } from "@/components/pages/rdm/rdmHomePage";
import { ProjectsPage } from "@/components/pages/rdm/projects/projectsDashboard";
import { ProjectDetailPage } from "@/components/pages/rdm/projects/projectDetails";
import { PagesDashboard } from "@/components/pages/rdm/pages/pagesDashboard";
import { CreateTemplate } from "@/components/pages/rdm/pages/pagesCreateTemplate";
import { EditTemplate } from "@/components/pages/rdm/pages/pagesEditTemplate";
import { DocumentManagementPage } from "@/components/pages/rdm/documentManagement/dmDashboard";
import { DiDashboard } from "@/components/pages/rdm/documentInsights/diDashboard";
import { TableExtraction } from "@/components/pages/rdm/documentInsights/tableExtraction";
import { DocumentChat } from "@/components/pages/rdm/documentInsights/documentChat";
import { Charting } from "@/components/pages/rdm/documentInsights/charting";
import { ChartReport } from "@/components/pages/rdm/documentInsights/chartReport";
import { ProtectedRdmLayout } from "@/components/pages/rdm/layouts/protected-rdm-layout";
import { HelpPage } from "@/components/pages/helpCenterPage";
import { ServicesPage as MainServicesPage } from "@/components/pages/servicesPage"
import { AboutUsPage } from "@/components/pages/aboutUsPage"
import { ReportingPage } from "@/components/pages/reportingPage"
import { FinancialServicesPage } from "@/components/pages/financialServicesPage"
import { ConsultingPage } from "@/components/pages/consultingPage"
import { ProServicesPage } from "@/components/pages/proServicesPage"
import { AccountPage } from "@/components/pages/account/AccountPage"
import { AdminSettingsLayout } from "@/components/pages/admin/settings/AdminSettingsLayout"
import { ForgotPasswordPage } from "@/components/pages/forgotPasswordPage";
import { ResetPasswordPage } from "@/components/pages/resetPasswordPage";
import { CollaboratorsPage } from "@/components/pages/rdm/collaborators/collaboratorsPage"
import { AcceptInvitePage } from "@/components/pages/acceptInvitePage"
import { ChartDashboard } from "@/components/pages/rdm/documentInsights/chartDashboard";


function App() {
  useTokenRefresh();

  const domain = window.location.hostname
  const isPortal = domain === 'portal.primith.com' || domain === 'portal.localhost'
  const isSupport = domain === 'support.primith.com' || domain === 'support.localhost'

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex h-screen w-screen">
        <div className="flex flex-1 flex-col">
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
                    <Route path="/account" element={
                      <ProtectedRoute>
                        <AccountPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route path="users" element={<UsersPage />} />
                      <Route path="organizations" element={<OrganizationsPage />} />
                      <Route path="roles" element={<RolesPage />} />
                      <Route path="services" element={<ServicesPage />} />
                    </Route>
                    <Route path="/admin/settings" element={<AdminSettingsLayout />}>
                      <Route path="administration" element={<AdministrationPage />} />
                      <Route path="licensing" element={<LicensingPage />} />
                      <Route path="billing" element={<BillingPage />} />
                    </Route>
                  </Route>
                  <Route element={<ProtectedRdmLayout />}>
                    <Route path="/rdm" element={<RdmHomePage />} />
                    <Route path="/rdm/projects" element={<ProjectsPage />} />
                    <Route path="/rdm/projects/:projectId" element={<ProjectDetailPage />} />
                    <Route path="/rdm/pages" element={<PagesDashboard />} />
                    <Route path="/rdm/pages/templates" element={<PagesDashboard />} />
                    <Route path="/rdm/document-management" element={<DocumentManagementPage />} />
                    <Route path="/rdm/document-insights" element={<DiDashboard />} />
                    <Route path="/rdm/document-insights/table-extraction" element={<TableExtraction />} />
                    <Route path="/rdm/document-insights/document-chat" element={<DocumentChat />} />
                    <Route path="/rdm/document-insights/chart-dashboard" element={<ChartDashboard />} />
                    <Route path="/rdm/document-insights/charting" element={<Charting />} />
                    <Route path="/rdm/document-insights/report" element={<ChartReport />} />
                    <Route path="/rdm/document-insights/report/:reportId" element={<ChartReport />} />
                    <Route path="/rdm/document-insights/report/:reportId/edit" element={<ChartReport />} />
                    <Route path="/rdm/collaborators" element={<CollaboratorsPage />} />
                    <Route path="/rdm/create-template" element={<CreateTemplate />} />
                    <Route path="/rdm/pages/templates/edit/:id" element={<EditTemplate />} />
                  </Route>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/accept-invite" element={<AcceptInvitePage />} />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
                  <Route path="*" element={<NotFoundPage />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/accept-invite" element={<AcceptInvitePage />} />
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
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  )
}

export default App