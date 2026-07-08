# Our Journey

A static vacation scrapbook site for saving trip memories, photo stacks, and future travel placeholders.

## What is included

- `index.html` is the public scrapbook page.
- `assets/images/plane.png` is the custom plane used on the route.
- `assets/photos/` is reserved for future local photo assets.

## Security note

This is a static site. There is no public admin page or client-side password in this version, because frontend-only passwords are visible in source code and are not secure.

For a real private admin page that works across devices, add a backend with server-side authentication, database storage, and server-side image uploads. Do not store admin passwords or private editing logic in client-side HTML/JavaScript.

## Running locally

From the project folder:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

## Private info audit

No API keys, tokens, passwords, real credentials, addresses, or personal file paths are intentionally stored in this repo.
