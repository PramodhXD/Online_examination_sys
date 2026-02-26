import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const VerifyOtp = lazy(() => import("../pages/auth/VerifyOtp"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));

const StudentDashboard = lazy(() => import("../pages/dashboard/StudentDashboard"));

const Practice = lazy(() => import("../pages/practice/Practice"));
const PracticeInstructions = lazy(() => import("../pages/practice/PracticeInstructions"));
const PracticeQuestions = lazy(() => import("../pages/practice/PracticeQuestions"));
const PracticeResult = lazy(() => import("../pages/practice/PracticeResult"));

const Assessments = lazy(() => import("../pages/assessment/Assessments"));
const AssessmentInstructions = lazy(() => import("../pages/assessment/AssessmentInstructions"));
const AssessmentQuestions = lazy(() => import("../pages/assessment/AssessmentQuestions"));
const AssessmentResult = lazy(() => import("../pages/assessment/AssessmentResult"));

const FaceVerification = lazy(() => import("../pages/student/FaceVerification"));
const PerformanceRecords = lazy(() => import("../pages/student/PerformanceRecords"));
const Certificates = lazy(() => import("../pages/student/Certificates"));
const Leaderboard = lazy(() => import("../pages/student/Leaderboard"));
const Profile = lazy(() => import("../pages/student/Profile"));
const Subscription = lazy(() => import("../pages/student/Subscription"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const StudentManagement = lazy(() => import("../pages/admin/StudentManagement"));
const ExamManagement = lazy(() => import("../pages/admin/ExamManagement"));
const QuestionBank = lazy(() => import("../pages/admin/QuestionBank"));
const LiveMonitoring = lazy(() => import("../pages/admin/LiveMonitoring"));
const ResultsAnalytics = lazy(() => import("../pages/admin/ResultsAnalytics"));
const ReportsLogs = lazy(() => import("../pages/admin/ReportsLogs"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const CertificateIssuance = lazy(() => import("../pages/admin/CertificateIssuance"));

const FaceCapture = lazy(() => import("../components/face/FaceCapture"));

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center text-slate-500"
          role="status"
          aria-live="polite"
        >
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/face-capture"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <FaceCapture />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Subscription />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practice"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Practice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice/instructions"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PracticeInstructions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice/questions"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PracticeQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice/result"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PracticeResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessments"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Assessments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/instructions"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <AssessmentInstructions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/start"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <AssessmentQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/result"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <AssessmentResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PerformanceRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Certificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/face-verification"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <FaceVerification />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <AdminRoute>
              <StudentManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/exams"
          element={
            <AdminRoute>
              <ExamManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <AdminRoute>
              <QuestionBank />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/live"
          element={
            <AdminRoute>
              <LiveMonitoring />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <ResultsAnalytics />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <ReportsLogs />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <AdminRoute>
              <CertificateIssuance />
            </AdminRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
