// ============ COURSE DATA ============
// Used by the public courses popup (B.Tech branches, BBA, BCA)

export interface Branch {
  code: string;
  name: string;
  duration: string;
  semesters: number;
  fees: string;
  description: string;
  subjects: string[];
}

export const BTECH_BRANCHES: Branch[] = [
  {
    code: "CSE",
    name: "Computer Science & Engineering",
    duration: "4 Years",
    semesters: 8,
    fees: "₹1,20,000 / year",
    description: "Industry-aligned curriculum covering AI/ML, full-stack development, cloud computing and cybersecurity. Strong placement record with top tech companies.",
    subjects: ["Data Structures", "Operating Systems", "DBMS", "Computer Networks", "Compiler Design", "Software Engineering", "AI & ML", "Cloud Computing"],
  },
  {
    code: "IT",
    name: "Information Technology",
    duration: "4 Years",
    semesters: 8,
    fees: "₹1,15,000 / year",
    description: "Focused on enterprise software, web technologies, cybersecurity and data analytics. Designed for the modern IT industry.",
    subjects: ["Web Technology", "Information Security", "Data Analytics", "Mobile Computing", "Distributed Systems", "Cloud Architecture", "DevOps", "Big Data"],
  },
  {
    code: "ME",
    name: "Mechanical Engineering",
    duration: "4 Years",
    semesters: 8,
    fees: "₹1,10,000 / year",
    description: "Covers thermodynamics, manufacturing, robotics and automotive engineering with state-of-the-art workshops and CAD/CAM labs.",
    subjects: ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing Processes", "Heat Transfer", "Robotics", "CAD/CAM", "Industrial Engineering"],
  },
  {
    code: "CHE",
    name: "Chemical Engineering",
    duration: "4 Years",
    semesters: 8,
    fees: "₹1,10,000 / year",
    description: "Equips students with skills in process design, petroleum refining, polymer technology and environmental engineering.",
    subjects: ["Process Calculations", "Chemical Reaction Engineering", "Mass Transfer", "Heat Transfer", "Process Control", "Petroleum Refining", "Polymer Technology", "Environmental Engineering"],
  },
  {
    code: "EE",
    name: "Electrical Engineering",
    duration: "4 Years",
    semesters: 8,
    fees: "₹1,10,000 / year",
    description: "Comprehensive program covering power systems, electronics, control systems and renewable energy technologies.",
    subjects: ["Circuit Theory", "Electrical Machines", "Power Systems", "Control Systems", "Power Electronics", "Renewable Energy", "Microprocessors", "Electric Drives"],
  },
  {
    code: "CE",
    name: "Civil Engineering",
    duration: "4 Years",
    semesters: 8,
    fees: "₹1,10,000 / year",
    description: "Trains students in structural design, transportation, geotechnical and environmental engineering for infrastructure development.",
    subjects: ["Surveying", "Structural Analysis", "Concrete Technology", "Geotechnical Engineering", "Transportation", "Hydraulics", "Environmental Engg", "Construction Management"],
  },
];

export const OTHER_COURSES: Branch[] = [
  {
    code: "BBA",
    name: "Bachelor of Business Administration",
    duration: "3 Years",
    semesters: 6,
    fees: "₹85,000 / year",
    description: "Holistic management program preparing students for careers in marketing, finance, HR and entrepreneurship through case studies and industry projects.",
    subjects: ["Principles of Management", "Marketing Management", "Financial Accounting", "Business Economics", "Organisational Behaviour", "Human Resource Management", "Business Law", "Strategic Management"],
  },
  {
    code: "BCA",
    name: "Bachelor of Computer Applications",
    duration: "3 Years",
    semesters: 6,
    fees: "₹80,000 / year",
    description: "Application-oriented computer science program covering programming, web development, databases and emerging technologies.",
    subjects: ["C Programming", "Data Structures", "OOPs with Java", "Web Technology", "DBMS", "Computer Networks", "Software Engineering", "Mobile App Development"],
  },
];

// ============ TIMETABLE STRUCTURE ============
export interface TimeSlot {
  slot: number | "break" | "lunch";
  label: string;
  time: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  { slot: 1, label: "1", time: "09:05–09:55" },
  { slot: 2, label: "2", time: "09:55–10:45" },
  { slot: "break", label: "Break", time: "10:45–10:55" },
  { slot: 3, label: "3", time: "10:55–11:45" },
  { slot: 4, label: "4", time: "11:45–12:35" },
  { slot: "lunch", label: "Lunch", time: "12:35–01:25" },
  { slot: 5, label: "5", time: "01:25–02:15" },
  { slot: 6, label: "6", time: "02:15–03:05" },
  { slot: "break", label: "Break", time: "03:05–03:15" },
  { slot: 7, label: "7", time: "03:15–04:05" },
  { slot: 8, label: "8", time: "04:05–04:55" },
];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const SUBJECT_FULL_NAMES: Record<string, { name: string; faculty: string }> = {
  CN: { name: "Computer Networks", faculty: "Dr. Shishir Rastogi" },
  CD: { name: "Compiler Design", faculty: "Ms. Archana Rajora" },
  SE: { name: "Software Engineering", faculty: "Mr. Nikhil Tyagi" },
  DC: { name: "Digital Communication", faculty: "Dr. Neeraj Jain" },
  SPM: { name: "Software Project Management", faculty: "Mr. Aditya" },
  EITK: { name: "Emerging IT Knowledge", faculty: "Dr. P.K. Aggarwal" },
  PDP: { name: "Personality Development Program", faculty: "Ms. Saransh Sharma" },
};

export const CAMPUS_FACILITIES = [
  { icon: "BookOpen", title: "Central Library", desc: "50,000+ books, digital resources, IEEE & Springer journal access" },
  { icon: "Cpu", title: "Computer Labs", desc: "12 modern labs with high-end workstations and licensed software" },
  { icon: "Beaker", title: "Engineering Labs", desc: "Workshops for mechanical, chemical, electrical and civil branches" },
  { icon: "Trophy", title: "Sports Complex", desc: "Cricket, football, basketball courts and indoor games facility" },
  { icon: "Utensils", title: "Cafeteria", desc: "Hygienic multi-cuisine food court serving 800+ students daily" },
  { icon: "Wifi", title: "Wi-Fi Campus", desc: "1 Gbps internet across hostels, library, classrooms and labs" },
  { icon: "Bus", title: "Transport", desc: "Fleet of 25+ buses covering Modinagar, Ghaziabad and Meerut" },
  { icon: "Heart", title: "Medical Centre", desc: "On-campus clinic with resident doctor and tie-up with hospitals" },
];

export const HOSTEL_FACILITIES = [
  "Separate hostels for boys and girls",
  "AC and non-AC rooms available",
  "24×7 hot water and high-speed Wi-Fi",
  "Hygienic mess with weekly menu rotation",
  "Recreation room, gym & TV lounge",
  "24×7 security with CCTV surveillance",
  "On-call medical assistance",
  "Laundry and housekeeping services",
];
