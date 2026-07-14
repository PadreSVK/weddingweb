#!/usr/bin/env node
/**
 * seed-roles.js
 *   Pushes the predefined roles from insiders.json into the backend so the
 *   insiders' area shows them. Holder assignments and guest-invented custom
 *   roles are preserved; predefined roles removed from insiders.json are deleted.
 *
 * Run this once after deploying the API, and again whenever you change the
 * predefined roles (titles / categories / descriptions) in insiders.json.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_TOKEN = "<AdminAccessToken from weddingweb-api/.env>"
 *   node scripts/seed-roles.js
 *
 * Optional: $env:API_BASE to override the apiBase from insiders.json.
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'insiders.json'), 'utf8'));
  const apiBase = process.env.API_BASE || cfg.apiBase;
  const token = process.env.ADMIN_TOKEN;

  if (!token) {
    console.error('✖ Set ADMIN_TOKEN (the AdminAccessToken from weddingweb-api/.env).');
    process.exit(1);
  }
  const list = (cfg.roles && cfg.roles.list) || [];
  if (!list.length) {
    console.error('✖ No roles found in insiders.json (roles.list).');
    process.exit(1);
  }

  const roles = list.map(r => ({
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description || '',
  }));

  const url = apiBase.replace(/\/$/, '') + '/manage/roles/seed';
  console.log(`Seeding ${roles.length} roles → ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ roles }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    console.error(`✖ Seed failed (HTTP ${res.status}):`, data.error || data);
    process.exit(1);
  }
  console.log(`✓ Seeded. created=${data.created} updated=${data.updated} removed=${data.removed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
