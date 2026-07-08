const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const querystring = require("node:querystring");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const adminUsername = process.env.ADMIN_USERNAME;
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const sessionSecret = process.env.ADMIN_SESSION_SECRET;
const sessions = new Map();
const sessionMaxAgeMs = 12 * 60 * 60 * 1000;

if (!adminUsername || !adminPasswordHash || !sessionSecret) {
  console.error("Missing ADMIN_USERNAME, ADMIN_PASSWORD_HASH, or ADMIN_SESSION_SECRET.");
  console.error("Create a hash with: node scripts/hash-password.mjs \"your password\"");
  process.exit(1);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return [name, decodeURIComponent(rest.join("="))];
  }).filter(([name]) => name));
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function makeSessionCookie(sessionId) {
  return `oj_session=${sessionId}.${sign(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeMs / 1000}`;
}

function clearSessionCookie() {
  return "oj_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

function getSession(req) {
  const cookie = parseCookies(req.headers.cookie).oj_session;

  if (!cookie) {
    return null;
  }

  const [sessionId, signature] = cookie.split(".");
  const expected = sign(sessionId || "");

  if (!sessionId || !signature || signature.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

function verifyPassword(password) {
  const [scheme, iterationsText, salt, expectedHash] = adminPasswordHash.split("$");

  if (scheme !== "pbkdf2" || !iterationsText || !salt || !expectedHash) {
    return false;
  }

  const hash = crypto.pbkdf2Sync(password, salt, Number(iterationsText), 32, "sha256").toString("hex");
  if (hash.length !== expectedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(data);
  });
}

function safePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const filePath = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(root, `.${filePath}`);

  if (!resolved.startsWith(root) || path.basename(resolved).startsWith(".")) {
    return null;
  }

  return resolved;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/login" && req.method === "POST") {
    const form = querystring.parse(await readBody(req));
    const usernameOk = form.username === adminUsername;
    const passwordOk = typeof form.password === "string" && verifyPassword(form.password);

    if (!usernameOk || !passwordOk) {
      redirect(res, "/login.html?error=1");
      return;
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      username: adminUsername,
      expiresAt: Date.now() + sessionMaxAgeMs
    });
    res.writeHead(302, {
      Location: "/admin.html",
      "Set-Cookie": makeSessionCookie(sessionId)
    });
    res.end();
    return;
  }

  if (url.pathname === "/logout") {
    const cookie = parseCookies(req.headers.cookie).oj_session;
    const sessionId = cookie?.split(".")[0];

    if (sessionId) {
      sessions.delete(sessionId);
    }

    res.writeHead(302, {
      Location: "/",
      "Set-Cookie": clearSessionCookie()
    });
    res.end();
    return;
  }

  if (url.pathname === "/admin.html" && !getSession(req)) {
    redirect(res, "/login.html");
    return;
  }

  const filePath = safePath(url.pathname);

  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, host, () => {
  console.log(`Our Journey running at http://${host}:${port}/`);
});
