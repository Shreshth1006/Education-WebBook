import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Check the shared secret TOI sends in the header
  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Body can arrive as object or string depending on sender's content-type
  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { return res.status(400).json({ error: 'invalid json' }); }
  }
  if (!b) return res.status(400).json({ error: 'empty body' });

  // Required fields
  const required = ['name', 'email', 'category', 'expert', 'question'];
  const missing = required.filter(k => !b[k] || String(b[k]).trim() === '');
  if (missing.length) {
    return res.status(400).json({ error: 'missing fields', fields: missing });
  }

  const { error } = await sb.from('expert_questions').insert({
    name: String(b.name).trim(),
    email: String(b.email).trim().toLowerCase(),
    phone: b.phone ? String(b.phone).trim() : null,
    category: String(b.category).trim(),
    expert: String(b.expert).trim(),
    question: String(b.question).trim()
  });

  if (error) {
    console.error('supabase insert failed:', error.message);
    return res.status(500).json({ error: 'db insert failed' }); // TOI can retry
  }

  return res.status(200).json({ ok: true });
}