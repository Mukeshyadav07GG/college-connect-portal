import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Calendar, Image, Megaphone, LayoutDashboard, Users, BookOpen, PartyPopper, Wallet, Award, Building2, UserCog } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { useAuth } from "@/contexts/AuthContext";

const TimetableEdit = lazy(() => import("@/components/admin/TimetableEdit").then(m => ({ default: m.TimetableEdit })));
const HostelUpload = lazy(() => import("@/components/admin/HostelUpload").then(m => ({ default: m.HostelUpload })));
const HostelAllocations = lazy(() => import("@/components/admin/HostelAllocations").then(m => ({ default: m.HostelAllocations })));
const AnnouncementsAdmin = lazy(() => import("@/components/admin/AnnouncementsAdmin").then(m => ({ default: m.AnnouncementsAdmin })));
const UserManagement = lazy(() => import("@/components/admin/UserManagement").then(m => ({ default: m.UserManagement })));
const EventsAdmin = lazy(() => import("@/components/admin/EventsAdmin").then(m => ({ default: m.EventsAdmin })));
const SubjectsAdmin = lazy(() => import("@/components/admin/SubjectsAdmin").then(m => ({ default: m.SubjectsAdmin })));
const FeesManager = lazy(() => import("@/components/fees/FeesManager").then(m => ({ default: m.FeesManager })));
const ResultUpload = lazy(() => import("@/components/faculty/ResultUpload").then(m => ({ default: m.ResultUpload })));
const FacultyAdmin = lazy(() => import("@/components/admin/FacultyAdmin").then(m => ({ default: m.FacultyAdmin })));

const items = [
  { to: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/faculty", label: "Faculty Profiles", icon: <UserCog className="h-4 w-4" /> },
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

const Fallback = () => <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

const AdminDashboard = () => (
  <DashboardLayout title="Admin Portal" items={items} requiredRole="admin">
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="faculty" element={<FacultyAdmin />} />
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
    </Suspense>
  </DashboardLayout>
);

export default AdminDashboard;
