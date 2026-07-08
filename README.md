# Our Journey

A personal vacation scrapbook website for saving trip photos and memories.

## Files

- `index.html` - main website
- `admin.html` - editor page
- `login.html` - admin login page
- `server.js` - local server with protected admin login
- `assets/images/plane.png` - plane graphic
- `assets/photos/` - folder for future photos

## Set up admin login

Create a password hash:

```bash
node scripts/hash-password.mjs "your password"
```

Create a `.env` file using `.env.example`, then fill in:

```text
ADMIN_USERNAME=your-username
ADMIN_PASSWORD_HASH=the-hash-you-created
ADMIN_SESSION_SECRET=a-long-random-secret
```

Do not commit `.env`.

## Run locally

```bash
source .env
node server.js
```

Open:

```text
http://localhost:4173/
```

Admin:

```text
http://localhost:4173/admin.html
```
