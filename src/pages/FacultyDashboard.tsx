import { Routes, Route, Navigate } from "react-router-dom";
import { ClipboardCheck, FileText, Award, LayoutDashboard } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Attendance } from "@/components/faculty/Attendance";
import { AssignmentCreate } from "@/components/faculty/AssignmentCreate";
import { ResultUpload } from "@/components/faculty/ResultUpload";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/faculty", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/faculty/attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: "/faculty/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { to: "/faculty/results", label: "Results", icon: <Award className="h-4 w-4" /> },
];

const Overview = () => {
  const { profile } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass-card p-6"><h3 className="font-semibold mb-1">Attendance</h3><p className="text-sm text-muted-foreground">Mark today's attendance</p></Card>
        <Card className="glass-card p-6"><h3 className="font-semibold mb-1">Assignments</h3><p className="text-sm text-muted-foreground">Create and review</p></Card>
        <Card className="glass-card p-6"><h3 className="font-semibold mb-1">Results</h3><p className="text-sm text-muted-foreground">Upload marks</p></Card>
      </div>
    </div>
  );
};

const FacultyDashboard = () => (
  <DashboardLayout title="Faculty Portal" items={items} requiredRole="faculty">
    <Routes>
      <Route index element={<Overview />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="assignments" element={<AssignmentCreate />} />
      <Route path="results" element={<ResultUpload />} />
      <Route path="*" element={<Navigate to="/faculty" replace />} />
    </Routes>
  </DashboardLayout>
);

export default FacultyDashboard;
