const router = require("express").Router();
const api = require("../controllers/apiController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

// Students
router.get("/students/profile", api.myProfile);
router.patch("/students/profile", api.updateMyProfile);
router.get("/students", requireRole("faculty", "admin"), api.listStudents);

// Faculty
router.get("/faculty", api.listFaculty);

// Timetable
router.get("/timetable", api.getTimetable);

// Attendance
router.get("/attendance", api.getAttendance);
router.post("/attendance", requireRole("faculty", "admin"), api.markAttendance);

// Assignments
router.get("/assignments", api.listAssignments);
router.post("/assignments", requireRole("faculty", "admin"), api.createAssignment);
router.post("/assignments/submit", api.submitAssignment);

// Results
router.get("/results", api.listResults);
router.post("/results", requireRole("faculty", "admin"), api.upsertResult);

// Hostel
router.get("/hostel/me", api.myHostel);
router.get("/hostel/images", api.listHostelImages);

// Announcements and events
router.get("/announcements", api.listAnnouncements);
router.get("/events", api.listEvents);

// Fees and documents
router.get("/fees/me", api.myFees);

// Messages
router.post("/messages/send", api.sendMessage);
router.get("/messages/:peerId", api.getConversation);
router.patch("/messages/:id/read", api.markRead);

module.exports = router;
