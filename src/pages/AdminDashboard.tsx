import { Routes, Route, Navigate } from "react-router-dom";
import { Calendar, Image, Megaphone, LayoutDashboard, Users, BookOpen, PartyPopper, Wallet, Award, Building2, UserCog } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { TimetableEdit } from "@/components/admin/TimetableEdit";
import { HostelUpload } from "@/components/admin/HostelUpload";
import { HostelAllocations } from "@/components/admin/HostelAllocations";
import { AnnouncementsAdmin } from "@/components/admin/AnnouncementsAdmin";
import { UserManagement } from "@/components/admin/UserManagement";
import { EventsAdmin } from "@/components/admin/EventsAdmin";
import { SubjectsAdmin } from "@/components/admin/SubjectsAdmin";
import { FeesManager } from "@/components/fees/FeesManager";
import { ResultUpload } from "@/components/faculty/ResultUpload";
import { FacultyAdmin } from "@/components/admin/FacultyAdmin";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/timetable", label: "Timetable", icon: <Calendar className="h-4 w-4" /> },
  { to: "/admin/subjects", label: "Subjects", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/admin/events", label: "Events", icon: <PartyPopper className="h-4 w-4" /> },
  { to: "/admin/hostel", label: "Hostel Gallery", icon: <Image className="h-4 w-4" /> },
  { to: "/admin/hostel-allocations", label: "Hostel Allocations", icon: <Building2 className="h-4 w-4" /> },
  { to: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
  { to: "/admin/results", label: "Results", icon: <Award className="h-4 w-4" /> },
  { to: "/admin/fees", label: "Fees & Documents", icon: <Wallet className="h-4 w-4" /> },
];

const Overview = () => {
  const { profile } = useAuth();
  return <StatsOverview audience="admin" name={profile?.full_name} />;
};

const AdminDashboard = () => (
  <DashboardLayout title="Admin Portal" items={items} requiredRole="admin">
    <Routes>
      <Route index element={<Overview />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="timetable" element={<TimetableEdit />} />
      <Route path="subjects" element={<SubjectsAdmin />} />
      <Route path="events" element={<EventsAdmin />} />
      <Route path="hostel" element={<HostelUpload />} />
      <Route path="hostel-allocations" element={<HostelAllocations />} />
      <Route path="announcements" element={<AnnouncementsAdmin />} />
      <Route path="results" element={<ResultUpload />} />
      <Route path="fees" element={<FeesManager />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </DashboardLayout>
);

export default AdminDashboard;
