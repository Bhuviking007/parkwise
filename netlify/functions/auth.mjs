import { getStore } from "@netlify/blobs";

const store = getStore({ name: "parkwise-accounts", consistency: "strong" });
const enc = new TextEncoder();
const COOKIE = "parkwise_session";
const WEEK = 7 * 24 * 60 * 60;

// Hardcoded fallback configuration for the Parkwise demo.
// IMPORTANT: This file is server-side Netlify Function code, never import it in frontend JS.
// Do not use these demo credentials for a real production administrator account.
const ADMIN_USERNAME = "Bhuviking007";
const ADMIN_EMAIL = "bkgaming208@gmail.com";
const ADMIN_PASSWORD = "Bhuviking007";
const SESSION_SECRET = "parkwise-demo-session-secret-change-before-production-2026-10-09-8f1d2c7a";

function json(statusCode, body, headers = {}) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers
  }});
}
function norm(v) { return String(v || "").trim().toLowerCase(); }
function b64u(bytes) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function unb64u(s) {
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function derive(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2", salt, iterations:310000, hash:"SHA-256"}, key, 256);
  return new Uint8Array(bits);
}
async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$310000$${b64u(salt)}$${b64u(await derive(password,salt))}`;
}
async function verifyPassword(password, stored) {
  try {
    const [alg, rounds, saltText, hashText] = stored.split("$");
    if (alg !== "pbkdf2-sha256" || Number(rounds) !== 310000) return false;
    const actual = await derive(password, unb64u(saltText));
    const expected = unb64u(hashText);
    if (actual.length !== expected.length) return false;
    let diff = 0; for(let i=0;i<actual.length;i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch { return false; }
}
async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(SESSION_SECRET), {name:"HMAC",hash:"SHA-256"}, false, ["sign","verify"]);
}
async function makeSession(user) {
  const payload = b64u(enc.encode(JSON.stringify({u:user.username,e:user.email,r:user.role,x:Math.floor(Date.now()/1000)+WEEK})));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload)));
  return `${payload}.${b64u(sig)}`;
}
async function readSession(request) {
  const cookies = request.headers.get("cookie") || "";
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    const [payload, signature] = m[1].split(".");
    if (!payload || !signature || !await crypto.subtle.verify("HMAC", await hmacKey(), unb64u(signature), enc.encode(payload))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    if (!p.x || p.x < Math.floor(Date.now()/1000)) return null;
    const user = await store.get(`user:${norm(p.u)}`, {type:"json"});
    return user ? publicUser(user) : null;
  } catch { return null; }
}
function publicUser(u) { return {username:u.username,email:u.email,role:u.role,userId:u.userId || null}; }
function isRoleManager(user) { return !!user && (user.role === "admin" || user.role === "administrator" || user.role === "test_administrator"); }
async function ensureUserId(user) {
  if (user.userId && /^\d{12}$/.test(user.userId)) return user;
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000000000 + 100000000000);
    const existing = await store.get(`user-id:${id}`, {type:"text"});
    if (!existing) {
      user.userId = id;
      await store.set(`user-id:${id}`, user.username);
      await saveUser(user);
      return user;
    }
  }
  throw new Error("Could not allocate a unique user ID.");
}
async function allUsers() {
  const found = [];
  let cursor;
  do {
    const page = await store.list({prefix:"user:", cursor, limit:1000});
    for (const blob of (page.blobs || [])) {
      const key = blob.key;
      if (!key || key.startsWith("user-id:")) continue;
      const u = await store.get(key, {type:"json"});
      if (u && u.username && u.email) found.push(await ensureUserId(u));
    }
    cursor = page.cursor;
  } while (cursor);
  return found;
}
function cookie(value, maxAge) {
  const secure = (globalThis.Netlify?.env?.get?.("CONTEXT") === "production" || globalThis.process?.env?.CONTEXT === "production") ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
async function lookup(identifier) {
  const key = norm(identifier);
  if (!key) return null;
  const direct = await store.get(`user:${key}`, {type:"json"});
  if (direct) return direct;
  const emailKey = await store.get(`email:${key}`, {type:"text"});
  return emailKey ? await store.get(`user:${norm(emailKey)}`, {type:"json"}) : null;
}
async function saveUser(user) {
  await store.setJSON(`user:${norm(user.username)}`, user);
  await store.set(`email:${norm(user.email)}`, user.username);
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, {status:204,headers:{"allow":"GET, POST, OPTIONS"}});
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || (request.method === "GET" ? "me" : "");
  if (!["me","login","signup","logout","users","set-role"].includes(action)) return json(404,{error:"Unknown authentication action."});
  if (request.method !== (["me","users"].includes(action) ? "GET" : "POST")) return json(405,{error:"Method not allowed."},{allow:action==="me"?"GET":"POST"});
  if (action === "me") {
    try { let user=await readSession(request); if (user) { const stored=await store.get(`user:${norm(user.username)}`,{type:"json"}); if(stored) user=publicUser(await ensureUserId(stored)); } return json(200,{authenticated:!!user,user}); }
    catch(e) { return json(503,{error:"Authentication service is not configured. Check Netlify environment variables."}); }
  }
  if (action === "logout") return json(200,{ok:true},{ "set-cookie":cookie("",0) });
  if (action === "users" || action === "set-role") {
    try {
      const session = await readSession(request);
      if (!session) return json(401,{error:"Sign in to manage accounts."});
      const storedActor = await store.get(`user:${norm(session.username)}`,{type:"json"});
      if (!isRoleManager(storedActor)) return json(403,{error:"Only Administrators and the Test Administrator can change account roles."});
      if (action === "users") return json(200,{users:(await allUsers()).map(publicUser)});
      let body; try { body=await request.json(); } catch { return json(400,{error:"Invalid request."}); }
      const userId=String(body?.userId||"");
      const role=String(body?.role||"");
      const allowedRoles=["citizen","operator","officer","admin"];
      if (!/^\d{12}$/.test(userId) || !allowedRoles.includes(role)) return json(400,{error:"Choose a valid user ID and role."});
      const owner=await store.get(`user-id:${userId}`,{type:"text"});
      if (!owner) return json(404,{error:"User ID not found."});
      const target=await store.get(`user:${norm(owner)}`,{type:"json"});
      if (!target) return json(404,{error:"User account not found."});
      if (target.role === "test_administrator") return json(403,{error:"The Test Administrator role cannot be changed here."});
      target.role=role;
      target.roleUpdatedAt=new Date().toISOString();
      target.roleUpdatedBy=storedActor.username;
      await saveUser(target);
      return json(200,{ok:true,user:publicUser(await ensureUserId(target))});
    } catch(e) { return json(503,{error:"Account directory is unavailable. Check Netlify Blobs and function logs."}); }
  }
  let body;
  try { body=await request.json(); } catch { return json(400,{error:"Invalid request."}); }
  if (!body || typeof body !== "object") return json(400,{error:"Invalid request."});

  if (action === "signup") {
    const email=norm(body.identifier);
    const password=String(body.password||"");
    const passwordConfirm=String(body.passwordConfirm||"");
    const display=String(body.name||"").trim().replace(/[^\p{L}\p{N}_. -]/gu,"").slice(0,30);
    if (!validEmail(email)) return json(400,{error:"Use an email address to create an account."});
    if (password.length < 10) return json(400,{error:"Use a password with at least 10 characters."});
    if (password !== passwordConfirm) return json(400,{error:"Passwords do not match. Please re-enter them."});
    try {
      if (await store.get(`email:${email}`,{type:"text"})) return json(409,{error:"An account with this email already exists. Sign in instead."});
      const local=display || email.split("@")[0];
      let username=local, n=1;
      while (await store.get(`user:${norm(username)}`,{type:"json"})) username=`${local.slice(0,25)}${++n}`;
      const user={username,email,passwordHash:await passwordHash(password),role:"citizen",createdAt:new Date().toISOString()};
      await ensureUserId(user);
      await saveUser(user);
      return json(201,{ok:true,message:"Account created. You can now sign in."});
    } catch(e) { return json(503,{error:"Account storage is not ready. Enable Netlify Blobs and redeploy."}); }
  }

  if (action === "login") {
    const identifier=String(body.identifier||"").trim();
    const password=String(body.password||"");
    try {
      let user=await lookup(identifier);
      // One-time server-side bootstrap for the Test Administrator; credentials are only in private environment variables.
      const adminUser = ADMIN_USERNAME;
      const adminEmail = ADMIN_EMAIL;
      const adminPassword = ADMIN_PASSWORD;
      if (!user && adminPassword && password === adminPassword &&
          [norm(adminUser),norm(adminEmail)].includes(norm(identifier))) {
        const byName=await store.get(`user:${norm(adminUser)}`,{type:"json"});
        const byEmail=await store.get(`email:${norm(adminEmail)}`,{type:"text"});
        if (!byName && !byEmail) {
          user={username:adminUser,email:adminEmail,passwordHash:await passwordHash(adminPassword),role:"test_administrator",createdAt:new Date().toISOString()};
          await ensureUserId(user);
          await saveUser(user);
        } else user=await lookup(identifier);
      }
      if (!user && password === ADMIN_PASSWORD &&
          [norm(ADMIN_USERNAME), norm(ADMIN_EMAIL)].includes(norm(identifier))) {
        const byName = await store.get(`user:${norm(ADMIN_USERNAME)}`, {type:"json"});
        const byEmail = await store.get(`email:${norm(ADMIN_EMAIL)}`, {type:"text"});
        if (!byName && !byEmail) {
          user = {username:ADMIN_USERNAME,email:ADMIN_EMAIL,passwordHash:await passwordHash(ADMIN_PASSWORD),role:"test_administrator",createdAt:new Date().toISOString()};
          await ensureUserId(user);
          await saveUser(user);
        } else {
          user = await lookup(identifier);
          if (user && password === ADMIN_PASSWORD) {
            user.role = "test_administrator";
            await saveUser(user);
          }
        }
      }
      if (!user || !await verifyPassword(password,user.passwordHash)) return json(401,{error:"Invalid username/email or password."});
      user = await ensureUserId(user);
      // Keep the seeded demo admin role on the server-side record.
      if ([norm(ADMIN_USERNAME), norm(ADMIN_EMAIL)].includes(norm(identifier)) && password === ADMIN_PASSWORD && user.role !== "test_administrator") {
        user.role = "test_administrator";
        await saveUser(user);
      }
      const token=await makeSession(user);
      return json(200,{ok:true,user:publicUser(user)},{ "set-cookie":cookie(token,WEEK) });
    } catch(e) { return json(503,{error:"Authentication is not configured. Check Netlify Blobs and environment variables."}); }
  }
};
