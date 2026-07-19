# Fragments of Abundance — Placeholder Site

Static placeholder for fragmentsofabundance.com. Endless-scrolling field of sample
fragments, shuffled on every refresh, with Assembled Works as larger tiles.

## Files

- `index.html` — the whole site (single file)
- `CNAME` — tells GitHub Pages the custom domain
- `assets/` — logogram + favicon

## Deploy to GitHub Pages (one-time, ~15 min)

1. **Create a GitHub account** at github.com — sign up with
   fragmentsofabundance@gmail.com, username `fragmentsofabundance` (if free).

2. **Create the repo**: New repository → name it exactly
   `fragmentsofabundance.github.io` → Public → Create.

3. **Upload the files**: on the repo page, "uploading an existing file" →
   drag `index.html`, `CNAME`, and the `assets` folder in → Commit.
   (Drag the folder itself so the `assets/` path is kept.)

4. **Enable Pages**: repo Settings → Pages. For a repo named
   `<username>.github.io` it deploys automatically from `main`.
   Site is live in ~1 min at https://fragmentsofabundance.github.io

5. **Point the domain** — at your domain registrar's DNS settings, add:

   | Type  | Host | Value                          |
   |-------|------|--------------------------------|
   | A     | @    | 185.199.108.153                |
   | A     | @    | 185.199.109.153                |
   | A     | @    | 185.199.110.153                |
   | A     | @    | 185.199.111.153                |
   | CNAME | www  | fragmentsofabundance.github.io |

6. **Wait + secure**: DNS can take minutes to a day. Then in repo
   Settings → Pages, confirm the custom domain shows `fragmentsofabundance.com`
   and tick **Enforce HTTPS** (appears once the certificate is issued).

## Updating the site later

Edit `index.html` in the repo (or re-upload) — changes go live in ~1 min.
