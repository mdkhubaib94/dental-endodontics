import PedodonticsView from "./PedodonticsView";
import CompleteDentureCaseSheetView from "./CompleteDentureCaseSheetView";
import FpdCaseSheetView from "./FpdCaseSheetView";
import ImplantView from "./Implantview";
import PartialView from "./Partialview";
import ImplantPatientView from "./ImplantPatientView";
import ConservativeView from "./ConservativeView";

const CaseSheetView = ({ caseSheet }) => {
  switch (caseSheet.department) {
    case "pedodontics":
      return <PedodonticsView caseData={caseSheet} />;

    case "complete_denture":
      return <CompleteDentureCaseSheetView caseData={caseSheet} />;

    case "fpd":
      return <FpdCaseSheetView caseData={caseSheet} />;

    case "implant":
      return <ImplantView caseData={caseSheet} />;

    case "implant_patient":
      return <ImplantPatientView caseData={caseSheet} />;

    case "partial":
    case "partial_denture":
      return <PartialView caseData={caseSheet} />;

    case "conservativedentistryandendodontics":
    case "Conservative Dentistry and Endodontics":
      return <ConservativeView caseData={caseSheet} />;

    default:
      return <p>Department not supported</p>;
  }
};

export default CaseSheetView;
