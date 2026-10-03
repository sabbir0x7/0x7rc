import { useNavigate } from "react-router-dom";
import { ResearchLandingPage } from "@/features/research-manager/components/research-team-manager-app";
import { DocumentTitle } from "@/components/ui/document-title";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleEnter = () => {
    navigate("/dashboard");
  };

  return (
    <>
      <DocumentTitle title="0x7 Research Center - Research Team Manager" />
      <ResearchLandingPage onEnter={handleEnter} />
    </>
  );
}
