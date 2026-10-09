# Damaged Equipment Reporting System

A mobile-friendly static website for engineers to submit one damaged item per report, attach up to five photos, and let management review reports and record typed acknowledgement. Built with HTML, CSS, JavaScript, Supabase and Vercel.

## Project files

- `index.html` — public engineer form
- `success.html` — submission confirmation
- `dashboard.html` — management login and report dashboard
- `style.css` — responsive styling
- `supabase-client.js` — Supabase browser client configuration
- `report.js` — form validation, photo uploads and report submission
- `dashboard.js` — management login, report listing, filtering, acknowledgement and CSV export
- `supabase-setup.sql` — database table, permissions and private image bucket setup

## 1. Create Supabase project

1. Create a project at https://supabase.com/.
2. Open **Project Settings → API** (or **Data API / API Keys**, depending on the current dashboard layout).
3. Copy the **Project URL** and the **publishable key**. Older projects may call the publishable key `anon`.
4. Do not copy a `service_role` or `secret` key into this website.

## 2. Set up database and photo storage

1. In Supabase, open **SQL Editor**.
2. Create a new query.
3. Copy the complete contents of `supabase-setup.sql` into the editor and run it.
4. Confirm that `damage_reports` exists under **Table Editor** and that the `damage-photos` bucket exists under **Storage**. The bucket must be private.

The SQL grants public users permission to insert report fields only; it does not grant them permission to read reports or write acknowledgement fields. Signed-in management users can read reports, view photos through short-lived signed URLs, and update acknowledgement fields.

## 3. Add the Supabase connection

Open `supabase-client.js` and replace:

- `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
- `PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE`

with your actual Project URL and publishable key. These browser-side values identify your project; database and storage policies must remain enabled. Never use a service-role/secret key here.

## 4. Create the boss's login

1. In Supabase, open **Authentication → Users**.
2. Add/invite the manager's user with their work email.
3. Set a strong password and share it with the manager privately.
4. In **Authentication → Settings**, disable public sign-ups if you do not want anyone creating a management account. Only create management accounts for authorized people.
5. Test the dashboard using that account.

The dashboard link is not a substitute for authentication. The app requires a signed-in account and the database policies enforce access. Keep the account password private.

## 5. Test locally

Because the JavaScript files use ES modules, do not open `index.html` directly as a `file://` URL.

In VS Code, install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**. Test:
- a report with valid fields and at least one image;
- validation for missing fields and unsupported/oversized images;
- the dashboard login;
- report visibility after login;
- acknowledgement name/date;
- CSV export;
- the dashboard while signed out (it should show the login screen).

## 6. Deploy to Vercel

1. Put all project files in one folder.
2. Create a GitHub repository and upload/push these files.
3. In https://vercel.com/, choose **Add New → Project**, import the repository, and deploy it as a static site. No build command is required; leave the output directory at the project root if prompted.
4. After deployment, open the Vercel URL and test both `https://YOUR-SITE.vercel.app/` and `https://YOUR-SITE.vercel.app/dashboard.html`.
5. Send the root URL to engineers. Send the dashboard URL only to management, but remember it still requires login.

## Important security and operational notes

- A static frontend cannot keep a password or secret key secret. Do not add one to JavaScript.
- The Supabase publishable key is intended for browser use only when Row Level Security and least-privilege grants are configured.
- The provided SQL allows anonymous report creation and photo uploads. This is appropriate for a trusted work form link but can be abused if the URL becomes public. If abuse becomes a concern, add server-side rate limiting or a server/Edge Function, CAPTCHA, or require engineer authentication.
- The manager acknowledgement records a typed name and date. It is an acknowledgement record, not a cryptographic or legally certified electronic signature.
- Consider a retention policy, backups, and who is authorized to see workplace photos before using this for official records.
- The form uses a browser date for its default date. Engineers should verify the date before submitting.
