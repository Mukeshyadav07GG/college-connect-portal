import { Routes, Route, Navigate } from "react-router-dom";
import { Calendar, Image, Megaphone, LayoutDashboard } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TimetableEdit } from "@/components/admin/TimetableEdit";
import { HostelUpload } from "@/components/admin/HostelUpload";
import { AnnouncementsAdmin } from "@/components/admin/AnnouncementsAdmin";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/admin/timetable", label: "Timetable", icon: <Calendar className="h-4 w-4" /> },
  { to: "/admin/hostel", label: "Hostel", icon: <Image className="h-4 w-4" /> },
  { to: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
];

const Overview = () => {
  const { profile } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Admin – {profile?.full_name}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass-card p-6"><h3 className="font-semibold mb-1">Timetable</h3><p className="text-sm text-muted-foreground">Edit slots</p></Card>
        <Card className="glass-card p-6"><h3 className="font-semibold mb-1">Hostel</h3><p className="text-sm text-muted-foreground">Manage gallery</p></Card>
        <Card className="glass-card p-6"><h3 className="font-semibold mb-1">Announcements</h3><p className="text-sm text-muted-foreground">Post notices</p></Card>
      </div>
    </div>
  );
};

const AdminDashboard = () => (
  <DashboardLayout title="Admin Portal" items={items} requiredRole="admin">
    <Routes>
      <Route index element={<Overview />} />
      <Route path="timetable" element={<TimetableEdit />} />
      <Route path="hostel" element={<HostelUpload />} />
      <Route path="announcements" element={<AnnouncementsAdmin />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </DashboardLayout>
);

export default AdminDashboard;
