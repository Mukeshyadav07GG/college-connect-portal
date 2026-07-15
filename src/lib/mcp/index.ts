import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listAnnouncements from "./tools/list-announcements";
import listEvents from "./tools/list-events";
import listFacultyDirectory from "./tools/list-faculty-directory";
import uploadAssignment from "./tools/upload-assignment";

// The OAuth issuer must be the direct Supabase host — never SUPABASE_URL (which
// may be a .lovable.cloud proxy). Vite inlines VITE_SUPABASE_PROJECT_ID as a
// literal at build time, so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "knmiet-erp-mcp",
  title: "KNMIET ERP",
  version: "0.1.0",
  instructions:
    "Tools for the KNMIET student, faculty, and admin portal. Use `get_my_profile` to see the signed-in user, `list_announcements` and `list_events` for portal updates, `list_faculty_directory` to browse faculty, and `upload_assignment` (faculty/admin) to create an assignment for a chosen course, branch, subject, and deadline with a file attachment.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listAnnouncements, listEvents, listFacultyDirectory, uploadAssignment],
});
