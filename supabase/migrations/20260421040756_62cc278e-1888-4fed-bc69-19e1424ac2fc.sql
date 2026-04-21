TRUNCATE TABLE public.assignment_submissions, public.assignments, public.results,
               public.attendance, public.announcements, public.chat_messages,
               public.hostel_images, public.subject_notes RESTART IDENTITY;
DELETE FROM auth.users WHERE email LIKE '%@knmiet.local';
DELETE FROM public.profiles WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);