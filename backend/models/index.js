const { User, UserRole, Profile, ActiveSession } = require("./User");
const Faculty = require("./Faculty");
const { Subject, SubjectCodeMap, SubjectNote, SyllabusUnit, SyllabusProblem } = require("./Subject");
const Timetable = require("./Timetable");
const Attendance = require("./Attendance");
const { Assignment, AssignmentSubmission } = require("./Assignment");
const Result = require("./Result");
const { HostelAllocation, HostelImage } = require("./Hostel");
const { Announcement, Event } = require("./Announcement");
const { StudentFee, StudentDocument } = require("./Fee");
const ChatMessage = require("./ChatMessage");

/** table name (as used by the frontend) -> mongoose model */
const models = {
  users: User,
  user_roles: UserRole,
  profiles: Profile,
  active_sessions: ActiveSession,
  faculty: Faculty,
  subjects: Subject,
  subject_code_map: SubjectCodeMap,
  subject_notes: SubjectNote,
  syllabus_units: SyllabusUnit,
  syllabus_problems: SyllabusProblem,
  timetable: Timetable,
  attendance: Attendance,
  assignments: Assignment,
  assignment_submissions: AssignmentSubmission,
  results: Result,
  hostel_allocations: HostelAllocation,
  hostel_images: HostelImage,
  announcements: Announcement,
  events: Event,
  student_fees: StudentFee,
  student_documents: StudentDocument,
  chat_messages: ChatMessage,
};

module.exports = {
  models,
  User,
  UserRole,
  Profile,
  ActiveSession,
  Faculty,
  Subject,
  SubjectCodeMap,
  SubjectNote,
  SyllabusUnit,
  SyllabusProblem,
  Timetable,
  Attendance,
  Assignment,
  AssignmentSubmission,
  Result,
  HostelAllocation,
  HostelImage,
  Announcement,
  Event,
  StudentFee,
  StudentDocument,
  ChatMessage,
};
