import { Routes, Route, Navigate } from "react-router-dom";
import { Calendar, Image, Megaphone, LayoutDashboard, Users, BookOpen, PartyPopper } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { TimetableEdit } from "@/components/admin/TimetableEdit";
import { HostelUpload } from "@/components/admin/HostelUpload";
import { AnnouncementsAdmin } from "@/components/admin/AnnouncementsAdmin";
import { UserManagement } from "@/components/admin/UserManagement";
import { EventsAdmin } from "@/components/admin/EventsAdmin";
import { SubjectsAdmin } from "@/components/admin/SubjectsAdmin";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/timetable", label: "Timetable", icon: <Calendar className="h-4 w-4" /> },
  { to: "/admin/subjects", label: "Subjects", icon: <BookOpen className="h-4 w-4" /> },
  { to: "/admin/events", label: "Events", icon: <PartyPopper className="h-4 w-4" /> },
  { to: "/admin/hostel", label: "Hostel", icon: <Image className="h-4 w-4" /> },
  { to: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
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
      <Route path="announcements" element={<AnnouncementsAdmin />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </DashboardLayout>
);

export default AdminDashboard;
