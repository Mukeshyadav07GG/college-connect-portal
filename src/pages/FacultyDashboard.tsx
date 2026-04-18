import { Routes, Route, Navigate } from "react-router-dom";
import { ClipboardCheck, FileText, Award, LayoutDashboard, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { Attendance } from "@/components/faculty/Attendance";
import { AssignmentCreate } from "@/components/faculty/AssignmentCreate";
import { ResultUpload } from "@/components/faculty/ResultUpload";
import { SubmissionsViewer } from "@/components/faculty/SubmissionsViewer";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/faculty", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/faculty/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: "/faculty/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { to: "/faculty/submissions", label: "Submissions", icon: <Inbox className="h-4 w-4" /> },
  { to: "/faculty/results", label: "Results", icon: <Award className="h-4 w-4" /> },
];

const Overview = () => {
  const { profile } = useAuth();
  return <StatsOverview audience="faculty" name={profile?.full_name} />;
};

const FacultyDashboard = () => (
  <DashboardLayout title="Faculty Portal" items={items} requiredRole="faculty">
    <Routes>
      <Route index element={<Overview />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="assignments" element={<AssignmentCreate />} />
      <Route path="submissions" element={<SubmissionsViewer />} />
      <Route path="results" element={<ResultUpload />} />
      <Route path="*" element={<Navigate to="/faculty" replace />} />
    </Routes>
  </DashboardLayout>
);

export default FacultyDashboard;
