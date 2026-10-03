import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/layouts/global/layout.tsx";
import { Error404 } from "@/components/ui/error-404.tsx";
import { isCloud } from "@/lib/config.ts";
import { useTranslation } from "react-i18next";
import { useRedirectToCloudSelect } from "@/ee/hooks/use-redirect-to-cloud-select.tsx";
import { useTrackOrigin } from "@/hooks/use-track-origin";
import useCurrentUser from "@/features/user/hooks/use-current-user";


const SetupWorkspace = lazy(() => import("@/pages/auth/setup-workspace.tsx"));
const LoginPage = lazy(() => import("@/pages/auth/login"));
const Home = lazy(() => import("@/pages/dashboard/home"));
const Page = lazy(() => import("@/pages/page/page"));
const AccountSettings = lazy(
  () => import("@/pages/settings/account/account-settings"),
);
const WorkspaceMembers = lazy(
  () => import("@/pages/settings/workspace/workspace-members"),
);
const WorkspaceSettings = lazy(
  () => import("@/pages/settings/workspace/workspace-settings"),
);
const Groups = lazy(() => import("@/pages/settings/group/groups"));
const GroupInfo = lazy(() => import("./pages/settings/group/group-info"));
const Spaces = lazy(() => import("@/pages/settings/space/spaces.tsx"));
const AccountPreferences = lazy(
  () => import("@/pages/settings/account/account-preferences.tsx"),
);
const SpaceHome = lazy(() => import("@/pages/space/space-home.tsx"));
const PageRedirect = lazy(() => import("@/pages/page/page-redirect.tsx"));
const InviteSignup = lazy(() => import("@/pages/auth/invite-signup.tsx"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password.tsx"));
const PasswordReset = lazy(() => import("./pages/auth/password-reset"));
const Billing = lazy(() => import("@/ee/billing/pages/billing.tsx"));
const CloudLogin = lazy(() => import("@/ee/pages/cloud-login.tsx"));
const CreateWorkspace = lazy(() => import("@/ee/pages/create-workspace.tsx"));
const Security = lazy(() => import("@/ee/security/pages/security.tsx"));
const License = lazy(() => import("@/ee/licence/pages/license.tsx"));
const SharedPage = lazy(() => import("@/pages/share/shared-page.tsx"));
const PdfRenderPage = lazy(() => import("@/ee/pdf-export/pdf-render-page.tsx"));
const Shares = lazy(() => import("@/pages/settings/shares/shares.tsx"));
const ShareLayout = lazy(
  () => import("@/features/share/components/share-layout.tsx"),
);
const ShareRedirect = lazy(() => import("@/pages/share/share-redirect.tsx"));
const PublicSpacePage = lazy(
  () => import("@/pages/public-space/public-space-page.tsx"),
);
const PublicSpaceLayout = lazy(
  () => import("@/features/public-space/components/public-space-layout.tsx"),
);
const PublicSpaceDirectoryPage = lazy(
  () => import("@/pages/public-space/public-space-directory-page.tsx"),
);
const SpacesPage = lazy(() => import("@/pages/spaces/spaces.tsx"));
const MfaChallengePage = lazy(() =>
  import("@/ee/mfa/pages/mfa-challenge-page").then((m) => ({
    default: m.MfaChallengePage,
  })),
);
const MfaSetupRequiredPage = lazy(() =>
  import("@/ee/mfa/pages/mfa-setup-required-page").then((m) => ({
    default: m.MfaSetupRequiredPage,
  })),
);
const SpaceTrash = lazy(() => import("@/pages/space/space-trash.tsx"));
const UserApiKeys = lazy(() => import("@/ee/api-key/pages/user-api-keys"));
const WorkspaceApiKeys = lazy(
  () => import("@/ee/api-key/pages/workspace-api-keys"),
);
const AiSettings = lazy(() => import("@/ee/ai/pages/ai-settings.tsx"));
const BasePage = lazy(() => import("@/ee/base/pages/base-page.tsx"));
const AuditLogs = lazy(() => import("@/ee/audit/pages/audit-logs.tsx"));
const VerifiedPages = lazy(
  () => import("@/ee/page-verification/pages/verified-pages.tsx"),
);
const TemplateList = lazy(() => import("@/ee/template/pages/template-list"));
const TemplateEditor = lazy(
  () => import("@/ee/template/pages/template-editor"),
);
const FavoritesPage = lazy(() => import("@/pages/favorites/favorites-page"));
const AiChat = lazy(() => import("@/ee/ai-chat/pages/ai-chat.tsx"));
const VerifyEmail = lazy(() => import("@/ee/pages/verify-email.tsx"));
const LabelPage = lazy(() => import("@/pages/label/label-page"));
const OAuthConsent = lazy(() => import("@/ee/oauth/pages/oauth-consent.tsx"));
const LandingPage = lazy(() => import("@/pages/research/landing-page"));
const ResearchDashboardPage = lazy(
  () => import("@/pages/research/dashboard-page"),
);

function RootRoute() {
  return <LandingPage />;
}

export default function App() {
  const { t } = useTranslation();
  useRedirectToCloudSelect();
  useTrackOrigin();

  useEffect(() => {
    // warm the editor chunk so opening a page doesn't wait on the network
    const timer = setTimeout(() => import("@/pages/page/page"), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path={"/welcome"} element={<LandingPage />} />
        <Route path={"/dashboard"} element={<ResearchDashboardPage />} />
        <Route path={"/login"} element={<Navigate to="/welcome" replace />} />
        <Route path={"/login/*"} element={<Navigate to="/welcome" replace />} />
        <Route path={"/invites/*"} element={<Navigate to="/welcome" replace />} />
        <Route path={"/forgot-password"} element={<Navigate to="/welcome" replace />} />
        <Route path={"/password-reset"} element={<Navigate to="/welcome" replace />} />
        <Route path={"/setup/*"} element={<Navigate to="/welcome" replace />} />
        <Route path={"/setup"} element={<Navigate to="/welcome" replace />} />

        <Route path={"/docs"} element={<Navigate to="/dashboard" replace />} />
        <Route path={"/docs/*"} element={<Navigate to="/dashboard" replace />} />

        <Route path={"/pdf-render/:pageId"} element={<PdfRenderPage />} />
        <Route path={"/share/:shareId"} element={<ShareRedirect />} />
        <Route path={"/p/:pageSlug"} element={<PageRedirect />} />

        <Route element={<Layout />}>
          <Route path={"/home"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/spaces"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/favorites"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/labels/*"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/templates"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/templates/*"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/s/:spaceSlug"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/s/:spaceSlug/trash"} element={<Navigate to="/dashboard" replace />} />
          <Route
            path={"/s/:spaceSlug/p/:pageSlug"}
            element={<Page />}
          />
          <Route path={"/base/*"} element={<Navigate to="/dashboard" replace />} />
          <Route path={"/settings/*"} element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
