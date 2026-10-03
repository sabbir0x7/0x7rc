import { LoginForm } from "@/features/auth/components/login-form";
import { useTranslation } from "react-i18next";
import { DocumentTitle } from "@/components/ui/document-title.tsx";
import useCurrentUser from "@/features/user/hooks/use-current-user";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import APP_ROUTE from "@/lib/app-route";

export default function LoginPage() {
  const { t } = useTranslation();
  const { data } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (data?.user) {
      navigate(APP_ROUTE.HOME, { replace: true });
    }
  }, [data, navigate]);

  return (
    <>
      <DocumentTitle title={t("Login")} />
      <LoginForm />
    </>
  );
}
