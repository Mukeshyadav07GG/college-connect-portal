import { Routes, Route, Navigate } from "react-router-dom";
import { ClipboardCheck, FileText, Award, LayoutDashboard, Inbox, Users2, Wallet, BookOpen, Calendar, Megaphone, PartyPopper } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { Attendance } from "@/components/faculty/Attendance";
import { AssignmentCreate } from "@/components/faculty/AssignmentCreate";
import { ResultUpload } from "@/components/faculty/ResultUpload";
import { SubmissionsViewer } from "@/components/faculty/SubmissionsViewer";
import { StudentDirectory } from "@/components/faculty/StudentDirectory";
import { FeesManager } from "@/components/fees/FeesManager";
import { Syllabus } from "@/components/student/Syllabus";
import { FacultyTimetable } from "@/components/faculty/FacultyTimetable";
import { AnnouncementsAdmin } from "@/components/admin/AnnouncementsAdmin";
import { EventsAdmin } from "@/components/admin/EventsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFeeManager } from "@/hooks/useFeeManager";

const baseItems = [
  { to: "/faculty", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/faculty/timetable", label: "Time Table", icon: <Calendar className="h-4 w-4" /> },
  { to: "/faculty/students", label: "My Students", icon: <Users2 className="h-4 w-4" /> },
  { to: "/faculty/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: "/faculty/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { to: "/faculty/submissions", label: "Submissions", icon: <Inbox className="h-4 w-4" /> },
  { to: "/faculty/syllabus", label: "Syllabus", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/faculty/results", label: "Results", icon: <Award className="h-4 w-4" /> },
];

const Overview = () => {
  const { profile } = useAuth();
  return <StatsOverview audience="faculty" name={profile?.full_name} />;
};

const FacultyDashboard = () => {
  const isFeeManager = useIsFeeManager();
  const items = isFeeManager
    ? [...baseItems, { to: "/faculty/fees", label: "Fees & Documents", icon: <Wallet className="h-4 w-4" /> }]
    : baseItems;

  return (
    <DashboardLayout title="Faculty Portal" items={items} requiredRole="faculty">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="timetable" element={<FacultyTimetable />} />
        <Route path="students" element={<StudentDirectory />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="assignments" element={<AssignmentCreate />} />
        <Route path="submissions" element={<SubmissionsViewer />} />
        <Route path="results" element={<ResultUpload />} />
        <Route path="syllabus" element={<Syllabus />} />
        <Route path="fees" element={<FeesManager />} />
        <Route path="*" element={<Navigate to="/faculty" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
