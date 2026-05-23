import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ClipboardCheck, FileText, Award, LayoutDashboard, Inbox, Users2, Wallet, BookOpen, Calendar, Megaphone, PartyPopper } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFeeManager } from "@/hooks/useFeeManager";

const Attendance = lazy(() => import("@/components/faculty/Attendance").then(m => ({ default: m.Attendance })));
const AssignmentCreate = lazy(() => import("@/components/faculty/AssignmentCreate").then(m => ({ default: m.AssignmentCreate })));
const ResultUpload = lazy(() => import("@/components/faculty/ResultUpload").then(m => ({ default: m.ResultUpload })));
const SubmissionsViewer = lazy(() => import("@/components/faculty/SubmissionsViewer").then(m => ({ default: m.SubmissionsViewer })));
const StudentDirectory = lazy(() => import("@/components/faculty/StudentDirectory").then(m => ({ default: m.StudentDirectory })));
const FeesManager = lazy(() => import("@/components/fees/FeesManager").then(m => ({ default: m.FeesManager })));
const Syllabus = lazy(() => import("@/components/student/Syllabus").then(m => ({ default: m.Syllabus })));
const FacultyTimetable = lazy(() => import("@/components/faculty/FacultyTimetable").then(m => ({ default: m.FacultyTimetable })));
const AnnouncementsAdmin = lazy(() => import("@/components/admin/AnnouncementsAdmin").then(m => ({ default: m.AnnouncementsAdmin })));
const EventsAdmin = lazy(() => import("@/components/admin/EventsAdmin").then(m => ({ default: m.EventsAdmin })));

const baseItems = [
  { to: "/faculty", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/faculty/timetable", label: "Time Table", icon: <Calendar className="h-4 w-4" /> },
  { to: "/faculty/students", label: "My Students", icon: <Users2 className="h-4 w-4" /> },
  { to: "/faculty/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: "/faculty/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { to: "/faculty/submissions", label: "Submissions", icon: <Inbox className="h-4 w-4" /> },
  { to: "/faculty/syllabus", label: "Syllabus", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/faculty/results", label: "Results", icon: <Award className="h-4 w-4" /> },
  { to: "/faculty/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
  { to: "/faculty/events", label: "Events", icon: <PartyPopper className="h-4 w-4" /> },
];

const Overview = () => {
  const { profile } = useAuth();
  return <StatsOverview audience="faculty" name={profile?.full_name} />;
};

const Fallback = () => <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

const FacultyDashboard = () => {
  const isFeeManager = useIsFeeManager();
  const items = isFeeManager
    ? [...baseItems, { to: "/faculty/fees", label: "Fees & Documents", icon: <Wallet className="h-4 w-4" /> }]
    : baseItems;

  return (
    <DashboardLayout title="Faculty Portal" items={items} requiredRole="faculty">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="timetable" element={<FacultyTimetable />} />
          <Route path="students" element={<StudentDirectory />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<AssignmentCreate />} />
          <Route path="submissions" element={<SubmissionsViewer />} />
          <Route path="results" element={<ResultUpload />} />
          <Route path="announcements" element={<AnnouncementsAdmin />} />
          <Route path="events" element={<EventsAdmin />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="fees" element={<FeesManager />} />
          <Route path="*" element={<Navigate to="/faculty" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
