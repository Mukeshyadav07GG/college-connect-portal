-- Clear dependent demo content first
TRUNCATE TABLE public.assignment_submissions, public.assignments, public.results,
               public.attendance, public.announcements, public.chat_messages,
               public.hostel_images, public.subject_notes RESTART IDENTITY;

-- Wipe demo auth users (cascades via FKs we don't control — we just cleared the dependents above)
DELETE FROM auth.users WHERE email LIKE '%@knmiet.local';

-- Clean orphans
DELETE FROM public.profiles WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Reset faculty directory
DELETE FROM public.faculty;
INSERT INTO public.faculty (name, role, email, subjects, description) VALUES
  ('Shishir Rastogi',    'Director',    NULL, NULL,                              'Director of the College'),
  ('Dr. Neeraj Jain',    'HOD',         NULL, ARRAY['KCS-601'],                  'Head of Department, CSE'),
  ('Mr. Nikhil Tyagi',   'Coordinator', NULL, ARRAY['KCS-601','KCS-653'],        'CSE Coordinator. Teaches Software Engineering & SE Lab.'),
  ('Mr. P.K. Agarwal',   'Professor',   NULL, ARRAY['KOE-068'],                  'Teaches Essence of Indian Traditional Knowledge (EITK).'),
  ('Mr. Aditya Paliwal', 'Professor',   NULL, ARRAY['KCS-603','NC-PDP','KCS-651'], 'Teaches Computer Network, PDP and CN Lab.'),
  ('Ms. Archana Rajora', 'Professor',   NULL, ARRAY['KCS-602','KCS-652'],        'Teaches Compiler Design and CD Lab.'),
  ('Mr. Saransh Sharma', 'Professor',   NULL, ARRAY['KCS-062','KCS-070'],        'Teaches Data Compression and Software Project Management.');

-- Reset subjects
DELETE FROM public.subjects;
INSERT INTO public.subjects (code, name, branch, semester, faculty_name) VALUES
  ('KCS-603', 'Computer Network',                        'CSE', 'VI', 'Mr. Aditya Paliwal'),
  ('KCS-062', 'Data Compression',                        'CSE', 'VI', 'Mr. Saransh Sharma'),
  ('KCS-601', 'Software Engineering',                    'CSE', 'VI', 'Mr. Nikhil Tyagi'),
  ('KOE-068', 'Essence of Indian Traditional Knowledge', 'CSE', 'VI', 'Mr. P.K. Agarwal'),
  ('KCS-070', 'Software Project Management',             'CSE', 'VI', 'Mr. Saransh Sharma'),
  ('KCS-602', 'Compiler Design',                         'CSE', 'VI', 'Ms. Archana Rajora'),
  ('KCS-651', 'CN Lab',                                  'CSE', 'VI', 'Mr. Aditya Paliwal'),
  ('KCS-652', 'Compiler Design Lab',                     'CSE', 'VI', 'Ms. Archana Rajora'),
  ('KCS-653', 'Software Engineering Lab',                'CSE', 'VI', 'Mr. Nikhil Tyagi'),
  ('NC-PDP',  'Personality Development Program',         'CSE', 'VI', 'Mr. Aditya Paliwal');