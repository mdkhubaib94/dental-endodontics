import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/AppHome';
import Login from './pages/Login';
import AdminLogin from './pages/Adminloginpage';
import PatientLogin from './pages/PatientLogin';
import DoctorLogin from './pages/DoctorLogin';
import SignUp from './pages/SignUp';
import SlotBooking from './pages/SlotBooking';
import PatientDashboard from './pages/PatientDashboard';
import UserType from './pages/UserType';
import DoctorDashboard from './pages/DoctorDashboard';
import ChiefDoctorDashboard from './pages/ChiefDoctorDashboard'
import UpdatePatient from './pages/UpdatePatient';
import MyAppointment from './pages/MyAppointment';
import DoctorSchedule from './pages/DoctorSchedules';
import CasePortal from './pages/casePortal';
import Pedodontics from './pages/departments/Pedodontics';
import ImplantPatient from './pages/departments/prosthodontics/ImplantPatient';
import { AuthProvider } from './pages/context/AuthContext';
import ProtectedRoute from './pages/context/ProtectedRoute';
import Prescription from './pages/prescription';
import PrescriptionView from './pages/PrescriptionView';
import AdminDashboard from './pages/AdminDashboard';
import CaseSheetViewer from './pages/CaseSheetViewer';
import CaseHistory from './pages/caseHistory';
import Unauthorized from './pages/Unauthorized'; // Import the new component
import ForgetPassword from './pages/forgetpassword';
import MyPrescriptions from './pages/MyPrescriptions';
import Complete_denture from './pages/departments/prosthodontics/Complete_denture';
import Partial from './pages/departments/prosthodontics/partial';
import Fpd from './pages/departments/prosthodontics/Fpd';
import Implant from './pages/departments/prosthodontics/Implant';
import DentalBillingApp from './pages/DentalBillingApp';
import BillX from './pages/casesheetBilling';
import XRayBilling from './pages/x_ray';
import WeeklyReportPage from './pages/WeeklyReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import YearlyReportPage from './pages/YearlyReportPage';
import ChiefDoctorReportsPage from './pages/ChiefDoctorReportsPage';
import GeneralCaseSheet from './pages/Generalcasesheet';
import GeneralCaseSheetView from './pages/GeneralCaseSheetView';
import DoctorProfile from './pages/Doctorprofilepage';
import PGDashboard from './pages/PGDashboard';
import UGDashboard from './pages/UGDashboard';
import ConsentForm from './pages/consentform';
import CampDashboard from './pages/CampDashboard';

const getDashboardRouteByRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (normalizedRole === 'patient') return '/patient-dashboard';
  if (normalizedRole === 'doctor') return '/doctor-dashboard';
  if (normalizedRole === 'chief' || normalizedRole === 'chief-doctor') return '/chief-doctor-dashboard';
  if (normalizedRole === 'pg') return '/pg-dashboard';
  if (normalizedRole === 'ug') return '/ug-dashboard';
  if (normalizedRole === 'admin' || normalizedRole === 'phc1' || normalizedRole === 'phc2') return '/admin-dashboard';
  if (normalizedRole === 'c') return '/camp-dashboard';
  return '';
};

const BackToDashboardButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasLocalBackButton, setHasLocalBackButton] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const dashboardPath = getDashboardRouteByRole(role);
  const pathname = location.pathname;

  const hiddenPaths = new Set([
    '/',
    '/login',
    '/signup',
    '/user',
    '/login/adminlogin',
    '/login/patientlogin',
    '/login/doctorlogin',
    '/reset-password',
    '/unauthorized',
  ]);

  useEffect(() => {
    const checkLocalBackButton = () => {
      const interactiveElements = Array.from(
        document.querySelectorAll('button, a, [role="button"]')
      );

      const localBackButtonExists = interactiveElements.some((element) => {
        if (element.classList?.contains('global-back-dashboard-btn')) {
          return false;
        }

        const className = String(element.className || '').toLowerCase();
        const hasKnownBackClass =
          className.includes('btn-back-dashboard') ||
          className.includes('back-btn') ||
          className.includes('dashboard-back') ||
          className.includes('back-dashboard') ||
          className.includes('back-to-dashboard');

        if (hasKnownBackClass) {
          return true;
        }

        const text = String(element.textContent || '').trim().toLowerCase();
        const ariaLabel = String(element.getAttribute('aria-label') || '').toLowerCase();
        const title = String(element.getAttribute('title') || '').toLowerCase();

        return (
          text.includes('back to dashboard') ||
          ariaLabel.includes('back to dashboard') ||
          title.includes('back to dashboard')
        );
      });

      setHasLocalBackButton(localBackButtonExists);
    };

    checkLocalBackButton();

    const observer = new MutationObserver(() => {
      checkLocalBackButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [pathname]);

  const shouldHide =
    !token ||
    !dashboardPath ||
    pathname === dashboardPath ||
    hiddenPaths.has(pathname) ||
    hasLocalBackButton;

  if (shouldHide) return null;

  return (
    <button
      type="button"
      className="global-back-dashboard-btn"
      onClick={() => navigate(dashboardPath)}
    >
      Back to Dashboard
    </button>
  );
};

const AppRoutes = () => {
  return (
    <>
      <BackToDashboardButton />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/adminlogin" element={<AdminLogin />} />
        <Route path="/login/patientlogin" element={<PatientLogin />} />
        <Route path="/login/doctorlogin" element={<DoctorLogin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/user" element={<UserType />} />
        <Route path="/my-prescriptions" element={<MyPrescriptions />} />
        {/* Protected Routes */}
        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'chief-doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pg-dashboard"
          element={
            <ProtectedRoute allowedRoles={['pg']}>
              <PGDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ug-dashboard"
          element={
            <ProtectedRoute allowedRoles={['ug']}>
              <UGDashboard />
            </ProtectedRoute>
          }
        />

        {/* Other Routes */}
        <Route
          path="/chief-doctor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['chief','chief-doctor']}>
              <ChiefDoctorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
         path="/doctor-profile"
         element={
            <ProtectedRoute allowedRoles={['doctor', 'chief-doctor', 'pg', 'admin']}>
            <DoctorProfile />
          </ProtectedRoute>
       }
      />
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['admin', 'phc1', 'phc2']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/camp-dashboard" element={
          <ProtectedRoute allowedRoles={['c']}>
            <CampDashboard />
          </ProtectedRoute>
        } />
        <Route
          path="/chief-doctor-dashboard/weekly-report"
          element={
            <ProtectedRoute allowedRoles={['chief','chief-doctor']}>
              <WeeklyReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chief-doctor-dashboard/monthly-report"
          element={
            <ProtectedRoute allowedRoles={['chief','chief-doctor']}>
              <MonthlyReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chief-doctor-dashboard/reports"
          element={
            <ProtectedRoute allowedRoles={['chief','chief-doctor']}>
              <ChiefDoctorReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/slot-booking" element={<SlotBooking />} />
        <Route path="/update-patient" element={<UpdatePatient />} />
        <Route path="/my-appointments" element={<MyAppointment />} />
        <Route
          path="/doctor-schedule"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'chief', 'chief-doctor', 'admin']}>
              <DoctorSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/general-case-sheet"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}>
              <GeneralCaseSheet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/general-case-view"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}>
              <GeneralCaseSheetView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/casePortal"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={[
                'pedodontics',
                'prosthodontics',
                'prothodontics',
                'prosthondontics',
                'completedenture',
                'fpd',
                'fixedpartialdenture',
                'implantology',
                'implant',
                'implantpatient',
                'partialdenture',
                'partial',
                'periodontics',
                'oralandmaxillofacial',
                'conservativedentistryandendodontics'
              ]}
            >
              <CasePortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedodontics"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['pedodontics']}
            >
              <Pedodontics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complete_denture"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['prosthodontics', 'prothodontics', 'prosthondontics', 'completedenture']}
            >
              <Complete_denture />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ImplantPatient"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['prosthodontics', 'prothodontics', 'prosthondontics', 'implantology', 'implant', 'implantpatient']}
            >
              <ImplantPatient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Implant"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['prosthodontics', 'prothodontics', 'prosthondontics', 'implantology', 'implant']}
            >
              <Implant />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Fpd"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['prosthodontics', 'prothodontics', 'prosthondontics', 'fpd', 'fixedpartialdenture']}
            >
              <Fpd />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partial"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['prosthodontics', 'prothodontics', 'prosthondontics', 'partialdenture', 'partial']}
            >
              <Partial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partial_denture"
          element={
            <ProtectedRoute
              allowedRoles={['doctor', 'chief', 'chief-doctor', 'pg', 'ug']}
              allowedDepartments={['prosthodontics', 'prothodontics', 'prosthondontics', 'partialdenture', 'partial']}
            >
              <Partial />
            </ProtectedRoute>
          }
        />

        <Route path="/prescriptions" element={<Prescription />} />
        <Route path="/prescription-view" element={<PrescriptionView />} />
        <Route path="/case-sheet-view/:caseId" element={<CaseSheetViewer />} />
        <Route path='/case-history' element={<CaseHistory />} />
        <Route path='/DentalBillingApp' element={<DentalBillingApp />} />
        <Route path='/admin-dashboard/billing/case' element={<BillX />} />
        <Route path='/admin-dashboard/billing/xray' element={<XRayBilling />} />
        <Route path='/consent-form' element={<ConsentForm />} />

        <Route path='/reset-password' element={<ForgetPassword />} />
        <Route path="/unauthorized" element={<center><h2>UnAuthorized Access Try!</h2></center>} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
