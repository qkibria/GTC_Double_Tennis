# Greenford Tennis Club (GTC) Doubles Tennis

A web app for generating doubles matches, recording results, and tracking
stats for GTC's Wednesday/Thursday sessions.

- **Anyone** with the link can view players, matches, results, and stats —
  no login needed.
- **Only the admin** (one login you'll set up below) can add players,
  generate matches, edit pairings, or enter results.

This guide assumes you've never used GitHub, Supabase, or Vercel before.
Follow it top to bottom, in order, and don't skip steps. It should take
about 20–30 minutes the first time. Everything happens in your web
browser — no coding, no terminal, no installing anything.

---

## What you'll end up with

- A free Supabase project — this is where all the data (players, matches,
  results) is stored.
- A free GitHub repository — this holds the app's code.
- A free Vercel project — this takes the code from GitHub and turns it
  into a live website, and automatically re-publishes it whenever the code
  changes.

All three are free for a small app like this one.

---

## Part 1 — Create the Supabase project (your database)

1. Go to **https://supabase.com** and click **Start your project**. Sign
   up (email, or "Continue with GitHub" once you've made your GitHub
   account in Part 2 — either order works, but doing Supabase first is
   fine too).
2. Once logged in, click **New project**.
3. Fill in:
   - **Name**: `gtc-doubles-tennis` (or anything you like)
   - **Database password**: click "Generate a password" and **save it
     somewhere safe** (a notes app or password manager) — you likely won't
     need it again, but keep it just in case.
   - **Region**: pick the one closest to Greenford, e.g. "London" or
     "West EU".
4. Click **Create new project**. It takes 1–2 minutes to set up — wait for
   the dashboard to finish loading.
5. In the left-hand sidebar, click the **SQL Editor** icon (looks like
   `>_`).
6. Click **New query**.
7. Open the file `supabase/schema.sql` from the project files (in the zip
   you downloaded), select all its text, copy it, and paste it into the
   SQL Editor box in Supabase.
8. Click **Run** (bottom right). You should see "Success. No rows
   returned." This has created the two tables the app needs (`players`
   and `weeks`), and locked them down so only a logged-in admin can make
   changes.
9. In the left sidebar, click **Project Settings** (gear icon) → **API**.
   You'll need two values from this page in a moment — keep this tab open
   or note them down:
   - **Project URL** (starts with `https://` and ends with
     `.supabase.co`)
   - **anon public** key (a long string of letters/numbers, under
     "Project API keys")

### Create your admin login

10. In the left sidebar, click **Authentication** → **Users**.
11. Click **Add user** → **Create new user**.
12. Enter your own real email address and choose a password. **Tick
    "Auto Confirm User"** if you see that option (this skips email
    verification, since you're creating the account yourself).
13. Click **Create user**. This is the email/password you'll use to log
    in as admin on the live site later — remember them.

---

## Part 2 — Put the code on GitHub

1. Go to **https://github.com** and click **Sign up** (or log in if you
   already have an account).
2. Once logged in, click the **+** icon (top right) → **New repository**.
3. Fill in:
   - **Repository name**: `gtc-doubles-tennis`
   - Keep it **Public** (this only makes the *code* public, not your
     data — your Supabase database is separate and stays protected)
   - Don't tick any of the "Initialize" checkboxes
4. Click **Create repository**.
5. On the next page, look for a link that says **"uploading an existing
   file"** and click it.
6. Unzip the project zip you were given on your computer first (double-click
   it — most computers do this automatically). Then, in the GitHub upload
   page, drag **all the files and folders from inside** the unzipped
   `gtc-doubles-tennis` folder (the `app` folder, `lib` folder, `public`
   folder, `supabase` folder, `package.json`, etc.) into the browser
   window. Don't drag the outer zip file itself, and don't drag the
   `gtc-doubles-tennis` folder as a single item — drag its *contents*, so
   the files land at the top level of the repository.
7. Wait for the upload to finish (a progress list appears).
8. Scroll down, and under "Commit changes" just click **Commit changes**
   (the default message is fine).

Your code is now on GitHub.

---

## Part 3 — Deploy to Vercel

1. Go to **https://vercel.com** and click **Sign up**. Choose **Continue
   with GitHub** and approve the connection — this lets Vercel see your
   repositories.
2. Once logged in, click **Add New...** → **Project**.
3. Find `gtc-doubles-tennis` in the list and click **Import**.
4. Before clicking Deploy, expand **Environment Variables** and add two:
   - Name: `NEXT_PUBLIC_SUPABASE_URL` — Value: paste the **Project URL**
     from Supabase (Part 1, step 9)
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Value: paste the **anon
     public** key from Supabase (Part 1, step 9)
5. Click **Deploy**. Wait 1–2 minutes while Vercel builds the site.
6. When it finishes, click the preview image or **Visit** — you now have
   a live URL like `https://gtc-doubles-tennis.vercel.app`. Share this
   with the club.

---

## Using the app

- **Everyone** (no login): can view the Generate tab's latest matches,
  the Record tab's results, and the Stats tab.
- **Admin**: click **Admin login** (top right), sign in with the email
  and password you created in Part 1, and you'll get full access to add
  players, generate matches, edit pairings, and enter results across all
  tabs. Click **Log out** when you're done on a shared/public computer.

### How match generation works

- **Courts** = number of selected players ÷ 4, rounded down. Leftover
  players sit out that round, rotating so it's not always the same people.
- **All but the last round**: players are split into a stronger half and
  weaker half by rating, one strong + one weak per pair. Both who partners
  whom and who plays whom rotate round to round, so it varies rather than
  repeating.
- **Last round**: the top 4 rated players from that session play one
  all-strong court together — a "strong round" to finish on.

### Editing pairings manually

Right after generating (as admin), tap **Edit pairings** — each court's
names become dropdowns you can reassign to anyone selected that week.
**Save pairing changes** commits it; **Cancel** reverts to the generated
draw.

---

## Making changes later

Whenever you want to tweak the app's design or features, come back and
ask for the updated files, then:

1. On GitHub, open the file(s) that changed, click the pencil (edit) icon,
   paste in the new content, and commit — or delete the old file and
   upload the new one the same way as Part 2.
2. Vercel automatically notices the change and re-deploys the live site
   within a minute or two — you don't need to do anything in Vercel itself.

## A note on security

The admin password protects all *editing*. Row-level security rules in
Supabase also block edits at the database level for anyone who isn't
logged in — so even someone who inspected the website's code couldn't
sneak in changes without your admin login. Keep the admin password
private, and only share it with people you trust to manage the club's
matches.
