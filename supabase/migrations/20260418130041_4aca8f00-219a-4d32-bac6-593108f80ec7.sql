
-- ============ ROLES (separate table to prevent privilege escalation) ============
CREATE TYPE public.app_role AS ENUM ('student', 'faculty', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  roll_number TEXT,
  employee_id TEXT,
  branch TEXT,
  semester TEXT,
  section TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE + ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  INSERT INTO public.profiles (user_id, full_name, email, roll_number, employee_id, branch, semester, section)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'employee_id',
    NEW.raw_user_meta_data->>'branch',
    NEW.raw_user_meta_data->>'semester',
    NEW.raw_user_meta_data->>'section'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SUBJECTS ============
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  faculty_name TEXT,
  branch TEXT,
  semester TEXT,
  units JSONB DEFAULT '[]'::jsonb,
  completion INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects readable by all" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Faculty/admin manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

-- ============ FACULTY DIRECTORY ============
CREATE TABLE public.faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  subjects TEXT[],
  description TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Faculty readable by all" ON public.faculty FOR SELECT USING (true);
CREATE POLICY "Admins manage faculty" ON public.faculty FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- ============ TIMETABLE ============
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  semester TEXT NOT NULL,
  branch TEXT NOT NULL,
  day TEXT NOT NULL,
  slot INT NOT NULL,
  subject_code TEXT,
  faculty_name TEXT,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section, day, slot)
);
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timetable readable by all" ON public.timetable FOR SELECT USING (true);
CREATE POLICY "Admin/faculty manage timetable" ON public.timetable FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- ============ ASSIGNMENTS ============
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_code TEXT,
  deadline TIMESTAMPTZ,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assignments readable by authenticated" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty/admin manage assignments" ON public.assignments FOR ALL USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Faculty view all submissions" ON public.assignment_submissions FOR SELECT USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students submit own" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own" ON public.assignment_submissions FOR UPDATE USING (auth.uid() = student_id);

-- ============ RESULTS ============
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('sessional1','sessional2','put','semester')),
  marks NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_code, exam_type)
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own results" ON public.results FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Faculty/admin view all results" ON public.results FOR SELECT USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Faculty/admin manage results" ON public.results FOR ALL USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_code, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Faculty/admin view all attendance" ON public.attendance FOR SELECT USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Faculty/admin manage attendance" ON public.attendance FOR ALL USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements readable by all" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Faculty/admin manage announcements" ON public.announcements FOR ALL USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events readable by all" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins manage events" ON public.events FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- ============ HOSTEL IMAGES ============
CREATE TABLE public.hostel_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hostel_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hostel images readable by all" ON public.hostel_images FOR SELECT USING (true);
CREATE POLICY "Admins manage hostel images" ON public.hostel_images FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- ============ CHAT ============
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own chats" ON public.chat_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users update own messages" ON public.chat_messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('assignments','assignments',false),
  ('submissions','submissions',false),
  ('hostel-images','hostel-images',true),
  ('avatars','avatars',true);

CREATE POLICY "Hostel images public read" ON storage.objects FOR SELECT USING (bucket_id = 'hostel-images');
CREATE POLICY "Admin upload hostel images" ON storage.objects FOR INSERT WITH CHECK (bucket_id='hostel-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete hostel images" ON storage.objects FOR DELETE USING (bucket_id='hostel-images' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id='avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated read assignments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='assignments');
CREATE POLICY "Faculty upload assignments" ON storage.objects FOR INSERT WITH CHECK (bucket_id='assignments' AND (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Students read own submissions" ON storage.objects FOR SELECT USING (bucket_id='submissions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Faculty read all submissions" ON storage.objects FOR SELECT USING (bucket_id='submissions' AND (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Students upload own submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id='submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ SEED DATA ============
INSERT INTO public.subjects (code, name, faculty_name, branch, semester, units, completion) VALUES
('CN','Computer Networks','Dr. Shishir Rastogi','CSE','VI','["Introduction & OSI Model","Data Link Layer","Network Layer & Routing","Transport Layer","Application Layer & Security"]'::jsonb, 65),
('CD','Compiler Design','Ms. Archana Rajora','CSE','VI','["Lexical Analysis","Syntax Analysis","Semantic Analysis","Code Optimization","Code Generation"]'::jsonb, 55),
('SE','Software Engineering','Mr. Nikhil Tyagi','CSE','VI','["SDLC & Process Models","Requirements Engineering","Design & Architecture","Testing & QA","Project Management"]'::jsonb, 70),
('DC','Digital Communication','Dr. Neeraj Jain','CSE','VI','["Signals & Systems","Sampling & Quantization","Digital Modulation","Error Detection","Spread Spectrum"]'::jsonb, 50),
('SPM','Software Project Management','Mr. Aditya','CSE','VI','["Project Planning","Estimation Techniques","Risk Management","Quality Assurance","Agile & DevOps"]'::jsonb, 60),
('EITK','Emerging IT Knowledge','Dr. P.K. Aggarwal','CSE','VI','["Cloud Computing","IoT","Blockchain","AI/ML Basics","Cybersecurity Trends"]'::jsonb, 45),
('PDP','Personality Development Program','Ms. Saransh Sharma','CSE','VI','["Communication Skills","Group Discussion","Interview Skills","Resume Building","Aptitude"]'::jsonb, 75);

INSERT INTO public.faculty (name, role, subjects, description) VALUES
('Dr. Shishir Rastogi','Professor & HoD',ARRAY['CN'],'Heads the CSE department with 18+ years of experience in computer networks and distributed systems.'),
('Ms. Archana Rajora','Assistant Professor',ARRAY['CD'],'Specializes in compiler design, formal languages and automata theory.'),
('Mr. Nikhil Tyagi','Assistant Professor & Coordinator',ARRAY['SE'],'Section CS31 coordinator. Expert in software engineering and full-stack development.'),
('Dr. Neeraj Jain','Associate Professor',ARRAY['DC'],'Researcher in digital communications and signal processing.'),
('Mr. Aditya','Assistant Professor',ARRAY['SPM'],'Industry veteran with deep expertise in agile project management.'),
('Dr. P.K. Aggarwal','Professor',ARRAY['EITK'],'Focuses on emerging technologies — cloud, IoT, blockchain.'),
('Ms. Saransh Sharma','Soft Skills Trainer',ARRAY['PDP'],'Trains students in communication, interview skills and personality development.'),
('Ms. Aditi Gautam','Assistant Professor & Deputy Coordinator',ARRAY[]::TEXT[],'Deputy coordinator for section CS31. Mentors students in academics and careers.');

-- Seed CS31 timetable (Mon-Sat, slots 1-8)
INSERT INTO public.timetable (section, semester, branch, day, slot, subject_code, faculty_name, room) VALUES
('CS31','VI','CSE','Monday',1,'CN','Dr. Shishir Rastogi','G26'),
('CS31','VI','CSE','Monday',2,'SE','Mr. Nikhil Tyagi','G26'),
('CS31','VI','CSE','Monday',3,'CD','Ms. Archana Rajora','G26'),
('CS31','VI','CSE','Monday',4,'DC','Dr. Neeraj Jain','G26'),
('CS31','VI','CSE','Monday',5,'SPM','Mr. Aditya','G26'),
('CS31','VI','CSE','Monday',6,'EITK','Dr. P.K. Aggarwal','G26'),
('CS31','VI','CSE','Monday',7,'PDP','Ms. Saransh Sharma','G26'),
('CS31','VI','CSE','Monday',8,'CN','Dr. Shishir Rastogi','Lab-1'),

('CS31','VI','CSE','Tuesday',1,'SE','Mr. Nikhil Tyagi','G26'),
('CS31','VI','CSE','Tuesday',2,'CN','Dr. Shishir Rastogi','G26'),
('CS31','VI','CSE','Tuesday',3,'DC','Dr. Neeraj Jain','G26'),
('CS31','VI','CSE','Tuesday',4,'CD','Ms. Archana Rajora','G26'),
('CS31','VI','CSE','Tuesday',5,'EITK','Dr. P.K. Aggarwal','G26'),
('CS31','VI','CSE','Tuesday',6,'SPM','Mr. Aditya','G26'),
('CS31','VI','CSE','Tuesday',7,'CD','Ms. Archana Rajora','Lab-2'),
('CS31','VI','CSE','Tuesday',8,'CD','Ms. Archana Rajora','Lab-2'),

('CS31','VI','CSE','Wednesday',1,'CD','Ms. Archana Rajora','G26'),
('CS31','VI','CSE','Wednesday',2,'DC','Dr. Neeraj Jain','G26'),
('CS31','VI','CSE','Wednesday',3,'CN','Dr. Shishir Rastogi','G26'),
('CS31','VI','CSE','Wednesday',4,'SE','Mr. Nikhil Tyagi','G26'),
('CS31','VI','CSE','Wednesday',5,'PDP','Ms. Saransh Sharma','G26'),
('CS31','VI','CSE','Wednesday',6,'EITK','Dr. P.K. Aggarwal','G26'),
('CS31','VI','CSE','Wednesday',7,'SPM','Mr. Aditya','G26'),
('CS31','VI','CSE','Wednesday',8,'SE','Mr. Nikhil Tyagi','Lab-1'),

('CS31','VI','CSE','Thursday',1,'DC','Dr. Neeraj Jain','G26'),
('CS31','VI','CSE','Thursday',2,'CD','Ms. Archana Rajora','G26'),
('CS31','VI','CSE','Thursday',3,'SE','Mr. Nikhil Tyagi','G26'),
('CS31','VI','CSE','Thursday',4,'CN','Dr. Shishir Rastogi','G26'),
('CS31','VI','CSE','Thursday',5,'SPM','Mr. Aditya','G26'),
('CS31','VI','CSE','Thursday',6,'PDP','Ms. Saransh Sharma','G26'),
('CS31','VI','CSE','Thursday',7,'EITK','Dr. P.K. Aggarwal','G26'),
('CS31','VI','CSE','Thursday',8,'DC','Dr. Neeraj Jain','Lab-3'),

('CS31','VI','CSE','Friday',1,'CN','Dr. Shishir Rastogi','G26'),
('CS31','VI','CSE','Friday',2,'SE','Mr. Nikhil Tyagi','G26'),
('CS31','VI','CSE','Friday',3,'EITK','Dr. P.K. Aggarwal','G26'),
('CS31','VI','CSE','Friday',4,'SPM','Mr. Aditya','G26'),
('CS31','VI','CSE','Friday',5,'CD','Ms. Archana Rajora','G26'),
('CS31','VI','CSE','Friday',6,'DC','Dr. Neeraj Jain','G26'),
('CS31','VI','CSE','Friday',7,'PDP','Ms. Saransh Sharma','G26'),
('CS31','VI','CSE','Friday',8,'CN','Dr. Shishir Rastogi','Lab-1'),

('CS31','VI','CSE','Saturday',1,'PDP','Ms. Saransh Sharma','G26'),
('CS31','VI','CSE','Saturday',2,'SPM','Mr. Aditya','G26'),
('CS31','VI','CSE','Saturday',3,'EITK','Dr. P.K. Aggarwal','G26'),
('CS31','VI','CSE','Saturday',4,'CN','Dr. Shishir Rastogi','G26');

-- Seed announcements
INSERT INTO public.announcements (title, body, category) VALUES
('Mid-Semester Exams Schedule Released','Sessional 2 exams will commence from the first week of next month. Detailed schedule has been posted on the notice board and student portal.','Exam'),
('Industrial Visit to Noida IT Park','B.Tech VI Sem CSE students are invited to register for the upcoming industrial visit. Limited seats available.','Event'),
('Library Timings Extended','In view of upcoming exams, the central library will remain open till 10:00 PM on weekdays.','Notice'),
('Placement Drive — TCS','TCS National Qualifier Test registrations are open. Eligible students must register by next Friday.','Placement');

-- Seed events
INSERT INTO public.events (title, description, event_date, location, category) VALUES
('Sessional 2 Begins','Mid-semester exams for VI Sem','2026-05-04','Examination Hall','Exam'),
('Tech Fest — Innovate 2026','Annual technology festival with hackathons, robotics and coding contests','2026-04-28','Main Auditorium','Fest'),
('TCS Placement Drive','Campus recruitment drive by TCS','2026-04-25','Seminar Hall','Placement'),
('Industrial Visit — Noida','Visit to Noida IT companies','2026-05-15','Noida','Visit'),
('Annual Sports Day','Inter-department sports competition','2026-05-20','Sports Ground','Sports'),
('Convocation 2026','Degree distribution ceremony','2026-06-10','Main Auditorium','Ceremony');
