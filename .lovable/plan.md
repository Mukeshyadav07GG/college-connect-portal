# Plan: Campus Facility Gallery + Mobile Dashboard Icon + Personal Login Greeting

## 1. "More than just classrooms" — Facility image popups (public site)

**Database (new table + bucket):**
- New table `public.facility_images`: `id`, `facility` (text — e.g. "Central Library"), `image_url`, `caption`, `uploaded_by`, `created_at`.
- GRANTS: `SELECT` to anon + authenticated, full CRUD to authenticated-with-admin-policy, `ALL` to service_role. RLS enabled.
- Policies: anyone (public site) can read; only admin (`has_role(auth.uid(),'admin')`) can insert/delete.
- New storage bucket `campus-images` (public) with same admin-only upload/delete policies as `hostel-images`.

**Frontend — `CampusLife.tsx`:**
- Fetch images from `facility_images` grouped by facility title (8 facilities: Central Library, Computer Labs, Engineering Labs, Sports Complex, Cafeteria, Wi-Fi Campus, Transport, Medical Centre).
- Cards remain as-is, plus tap/click opens a popup (Dialog) with a 2×2 grid of that facility's image cards (image + caption). If fewer than 4 images uploaded, remaining slots show a clean "Admin image add kare" placeholder tile so the grid always has 4 slots.

**Admin panel — new page `CampusGalleryUpload.tsx`:**
- Route `/admin/campus` in AdminDashboard (same pattern as `/admin/hostel`).
- Facility dropdown (the 8 titles) + multi-file upload + caption, images list with delete buttons. Reuses the `HostelUpload` upload flow (storage upload → public URL → insert row).

## 2. Hostel Gallery — show 4 images

- `Hostel.tsx` gallery grid changes from up to 6 images to exactly 4 (2×2 grid). If fewer uploaded, placeholder tiles fill the remaining slots.

## 3. Mobile Dashboard icon in Navbar

- Currently the Dashboard button is `hidden sm:inline-flex`, so on mobile only Sun/Moon and Logout show.
- Add an icon-only Dashboard button (LayoutDashboard icon) always visible on mobile, right next to the theme toggle and logout — same spot as desktop.
- Add a **"Go to Dashboard"** button at the top of the hamburger (☰) drawer too.
- Route by role: student → `/student`, faculty → `/faculty`, admin → `/admin`.

## 4. Login greeting with name + 👋

- `Login.tsx` and `LoginModal.tsx`: after successful sign-in, fetch the user's `full_name` from `profiles` and show:
  - `Welcome back, Palak! 👋` (name found)
  - Fallback: `Welcome back, Student!/Faculty!/Admin!` if no profile name.

## Verification

- Unit checks where logic is testable; Playwright check of: facility popup opens with 4 tiles, mobile navbar shows the dashboard icon, login toast shows the name.
- You will upload real facility photos from the new admin panel; popups fill up as you add them (minimum target 4 per facility).

## Technical notes

- Storage bucket via the storage tool (not SQL); policies via migration on `storage.objects`, copying the `hostel-images` pattern.
- Public read is required since the popup is on the public (signed-out) site.
