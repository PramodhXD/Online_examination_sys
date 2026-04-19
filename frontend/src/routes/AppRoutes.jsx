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
const VerifyCertificate = lazy(() => import("../pages/VerifyCertificate"));

const StudentDashboard = lazy(() => import("../pages/dashboard/StudentDashboard"));

const Practice = lazy(() => import("../pages/practice/Practice"));
const PracticeInstructions = lazy(() => import("../pages/practice/PracticeInstructions"));
const PracticeQuestions = lazy(() => import("../pages/practice/PracticeQuestions"));
const PracticeResult = lazy(() => import("../pages/practice/PracticeResult"));
const PracticeReview = lazy(() => import("../pages/practice/PracticeReview"));
const CodeEditor = lazy(() => import("../pages/student/CodeEditor"));

const Assessments = lazy(() => import("../pages/assessment/Assessments"));
const AssessmentInstructions = lazy(() => import("../pages/assessment/AssessmentInstructions"));
const AssessmentQuestions = lazy(() => import("../pages/assessment/AssessmentQuestions"));
const AssessmentResult = lazy(() => import("../pages/assessment/AssessmentResult"));

const FaceVerification = lazy(() => import("../pages/student/FaceVerification"));
const PerformanceRecords = lazy(() => import("../pages/student/PerformanceRecords"));
const Certificates = lazy(() => import("../pages/student/Certificates"));
const Leaderboard = lazy(() => import("../pages/student/Leaderboard"));
const MyTickets = lazy(() => import("../pages/student/MyTickets"));
const Notifications = lazy(() => import("../pages/student/Notifications"));
const Programming = lazy(() => import("../pages/programming/Programming"));
const ProgrammingPrecheck = lazy(() => import("../pages/programming/ProgrammingPrecheck"));
const ProgrammingExam = lazy(() => import("../pages/programming/Programmingexam"));
const Profile = lazy(() => import("../pages/student/Profile"));
const Subscription = lazy(() => import("../pages/student/Subscription"));
const ResumeAttempt = lazy(() => import("../pages/student/ResumeAttempt"));
const HelpSupport = lazy(() => import("../pages/student/HelpSupport"));
const Terms = lazy(() => import("../pages/student/Terms"));
const Privacy = lazy(() => import("../pages/student/Privacy"));
const ExamRules = lazy(() => import("../pages/student/ExamRules"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const StudentManagement = lazy(() => import("../pages/admin/StudentManagement"));
const ExamManagement = lazy(() => import("../pages/admin/ExamManagement"));
const QuestionBank = lazy(() => import("../pages/admin/QuestionBank"));
const LiveMonitoring = lazy(() => import("../pages/admin/LiveMonitoring"));
const ResultsAnalytics = lazy(() => import("../pages/admin/ResultsAnalytics"));
const ReportsLogs = lazy(() => import("../pages/admin/ReportsLogs"));
const AdminTickets = lazy(() => import("../pages/admin/AdminTickets"));
const TicketDetail = lazy(() => import("../pages/admin/TicketDetail"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const CertificateIssuance = lazy(() => import("../pages/admin/CertificateIssuance"));

const FaceCapture = lazy(() => import("../components/face/FaceCapture"));
const NotFound = lazy(() => import("../pages/NotFound"));
const AccessDenied = lazy(() => import("../pages/AccessDenied"));
const ServerError = lazy(() => import("../pages/ServerError"));

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
        <Route path="/verify-certificate" element={<VerifyCertificate />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="/server-error" element={<ServerError />} />
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
          path="/support"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <HelpSupport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/terms"
          element={<Terms />}
        />
        <Route
          path="/privacy"
          element={<Privacy />}
        />
        <Route
          path="/exam-rules"
          element={<ExamRules />}
        />
        <Route
          path="/resume-attempt"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <ResumeAttempt />
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
          path="/practice/review"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PracticeReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/code-editor"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <CodeEditor />
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
          path="/my-tickets"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <MyTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/programming"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Programming />
            </ProtectedRoute>
          }
        />
        <Route
          path="/programming-exam/:examId"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <ProgrammingPrecheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/programming-exam/:examId/start"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <ProgrammingExam />
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
          path="/admin/support"
          element={
            <AdminRoute>
              <AdminTickets />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <AdminRoute>
              <AdminTickets />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tickets/:ticketId"
          element={
            <AdminRoute>
              <TicketDetail />
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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
