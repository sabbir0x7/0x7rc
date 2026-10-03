import { useNavigate } from "react-router-dom";
import { ResearchTeamManagerApp } from "@/features/research-manager/components/research-team-manager-app";
import { DocumentTitle } from "@/components/ui/document-title";

export default function ResearchDashboardPage() {
  const navigate = useNavigate();

  const handleNavigateDocmost = () => {
    navigate("/spaces");
  };

  return (
    <>
      <DocumentTitle title="0x7 Research Center - Team Dashboard" />
      <ResearchTeamManagerApp
        initialAuthenticated={true}
        initialView="dashboard"
        onNavigateDocmost={handleNavigateDocmost}
      />
    </>
  );
}
