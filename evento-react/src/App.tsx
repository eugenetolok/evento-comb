import type { ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import DashboardLayout from "@/app/dashboard/layout";
import LoginPage from "@/app/login/page";
import ResetPasswordPage from "@/app/reset-password/page";
import DashboardPage from "@/app/dashboard/page";
import ToReadPage from "@/app/dashboard/toread/page";

import CompaniesAdminPage from "@/app/dashboard/companies/admin/page";
import CompaniesEditorPage from "@/app/dashboard/companies/editor/page";
import CompaniesOperatorPage from "@/app/dashboard/companies/operator/page";
import CompanyPage from "@/app/dashboard/companies/[id]/page";
import CompanyOperatorPage from "@/app/dashboard/companies/[id]/operator/page";

import MembersAdminPage from "@/app/dashboard/members/admin/page";
import MembersCompanyPage from "@/app/dashboard/members/company/page";
import MembersEditorPage from "@/app/dashboard/members/editor/page";
import MembersMonitoringPage from "@/app/dashboard/members/monitoring/page";
import MembersOperatorPage from "@/app/dashboard/members/operator/page";
import MemberPage from "@/app/dashboard/members/[id]/page";
import MemberOperatorPage from "@/app/dashboard/members/[id]/operator/page";
import MemberMonitoringPage from "@/app/dashboard/members/[id]/monitoring/page";

import AutosAdminPage from "@/app/dashboard/autos/admin/page";
import AutosCompanyPage from "@/app/dashboard/autos/company/page";
import AutosEditorPage from "@/app/dashboard/autos/editor/page";
import AutosOperatorPage from "@/app/dashboard/autos/operator/page";
import AutoPage from "@/app/dashboard/autos/[id]/page";
import AutoOperatorPage from "@/app/dashboard/autos/[id]/operator/page";

import AdminMainPage from "@/app/dashboard/admin/main/page";
import AdminKickPage from "@/app/dashboard/admin/kick/page";
import AdminCompanyFreezePage from "@/app/dashboard/admin/company-freeze/page";
import AdminReportsPage from "@/app/dashboard/admin/reports/page";
import AdminUsersPage from "@/app/dashboard/admin/users/page";
import AdminUserPage from "@/app/dashboard/admin/users/[id]/page";
import AdminEventsPage from "@/app/dashboard/admin/events/page";
import AdminEventPage from "@/app/dashboard/admin/events/[id]/page";
import AdminGatesPage from "@/app/dashboard/admin/gates/page";
import AdminGatePage from "@/app/dashboard/admin/gates/[id]/page";
import AdminBadgesPage from "@/app/dashboard/admin/badges/page";
import AdminBadgePage from "@/app/dashboard/admin/badges/[id]/page";
import AdminAccreditationsPage from "@/app/dashboard/admin/accreditations/page";
import AdminAccreditationPage from "@/app/dashboard/admin/accreditations/[id]/page";

type ParamPageComponent = (props: { params: Record<string, string | undefined> }) => JSX.Element;

function PageWithParams({ component: Component }: { component: ParamPageComponent }) {
  const params = useParams();
  return <Component params={params} />;
}

function DashboardRoute({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />

      <Route
        element={
          <DashboardRoute>
            <DashboardPage />
          </DashboardRoute>
        }
        path="/dashboard"
      />
      <Route
        element={
          <DashboardRoute>
            <ToReadPage />
          </DashboardRoute>
        }
        path="/dashboard/toread"
      />

      <Route
        element={
          <DashboardRoute>
            <CompaniesAdminPage />
          </DashboardRoute>
        }
        path="/dashboard/companies/admin"
      />
      <Route
        element={
          <DashboardRoute>
            <CompaniesEditorPage />
          </DashboardRoute>
        }
        path="/dashboard/companies/editor"
      />
      <Route
        element={
          <DashboardRoute>
            <CompaniesOperatorPage />
          </DashboardRoute>
        }
        path="/dashboard/companies/operator"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={CompanyPage} />
          </DashboardRoute>
        }
        path="/dashboard/companies/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={CompanyOperatorPage} />
          </DashboardRoute>
        }
        path="/dashboard/companies/:id/operator"
      />

      <Route
        element={
          <DashboardRoute>
            <MembersAdminPage />
          </DashboardRoute>
        }
        path="/dashboard/members/admin"
      />
      <Route
        element={
          <DashboardRoute>
            <MembersCompanyPage />
          </DashboardRoute>
        }
        path="/dashboard/members/company"
      />
      <Route
        element={
          <DashboardRoute>
            <MembersEditorPage />
          </DashboardRoute>
        }
        path="/dashboard/members/editor"
      />
      <Route
        element={
          <DashboardRoute>
            <MembersMonitoringPage />
          </DashboardRoute>
        }
        path="/dashboard/members/monitoring"
      />
      <Route
        element={
          <DashboardRoute>
            <MembersOperatorPage />
          </DashboardRoute>
        }
        path="/dashboard/members/operator"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={MemberPage} />
          </DashboardRoute>
        }
        path="/dashboard/members/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={MemberOperatorPage} />
          </DashboardRoute>
        }
        path="/dashboard/members/:id/operator"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={MemberMonitoringPage} />
          </DashboardRoute>
        }
        path="/dashboard/members/:id/monitoring"
      />

      <Route
        element={
          <DashboardRoute>
            <AutosAdminPage />
          </DashboardRoute>
        }
        path="/dashboard/autos/admin"
      />
      <Route
        element={
          <DashboardRoute>
            <AutosCompanyPage />
          </DashboardRoute>
        }
        path="/dashboard/autos/company"
      />
      <Route
        element={
          <DashboardRoute>
            <AutosEditorPage />
          </DashboardRoute>
        }
        path="/dashboard/autos/editor"
      />
      <Route
        element={
          <DashboardRoute>
            <AutosOperatorPage />
          </DashboardRoute>
        }
        path="/dashboard/autos/operator"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AutoPage} />
          </DashboardRoute>
        }
        path="/dashboard/autos/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AutoOperatorPage} />
          </DashboardRoute>
        }
        path="/dashboard/autos/:id/operator"
      />

      <Route
        element={
          <DashboardRoute>
            <AdminMainPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/main"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminKickPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/kick"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminCompanyFreezePage />
          </DashboardRoute>
        }
        path="/dashboard/admin/company-freeze"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminReportsPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/reports"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminUsersPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/users"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AdminUserPage} />
          </DashboardRoute>
        }
        path="/dashboard/admin/users/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminEventsPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/events"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AdminEventPage} />
          </DashboardRoute>
        }
        path="/dashboard/admin/events/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminGatesPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/gates"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AdminGatePage} />
          </DashboardRoute>
        }
        path="/dashboard/admin/gates/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminBadgesPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/badges"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AdminBadgePage} />
          </DashboardRoute>
        }
        path="/dashboard/admin/badges/:id"
      />
      <Route
        element={
          <DashboardRoute>
            <AdminAccreditationsPage />
          </DashboardRoute>
        }
        path="/dashboard/admin/accreditations"
      />
      <Route
        element={
          <DashboardRoute>
            <PageWithParams component={AdminAccreditationPage} />
          </DashboardRoute>
        }
        path="/dashboard/admin/accreditations/:id"
      />

      <Route element={<Navigate replace to="/dashboard" />} path="/" />
      <Route element={<Navigate replace to="/dashboard" />} path="*" />
    </Routes>
  );
}

export default App;
