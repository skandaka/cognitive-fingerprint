
export const runtime = 'edge';

interface Payload { scope: 'summary' | 'qa'; question?: string; snapshot: any; }

// Simple in-memory rate limiter (per IP-ish via header) - edge runtime ephemeral but adequate basic protection
const bucket: Record<string, { count: number; reset: number }> = {};
const LIMIT = 20; // requests
const WINDOW_MS = 60_000; // 1 minute

function sanitize(snapshot: any){
  if (!snapshot) return {};
  const clone = { ...snapshot };
  // Remove potentially identifying fields
  delete (clone as any).keystrokeHistory;
  delete (clone as any).raw;
  return clone;
}

export async function POST(req: Request){
  const apiKey = process.env.OPENAI_API_KEY;
  const body = await req.json() as Payload;
  const { scope, question } = body;
  const snapshot = sanitize(body.snapshot);

  // Rate limit
  let key = 'anon';
  try {
    // Using headers not guaranteed; best-effort.
    // @ts-ignore
    const ip = (req as any).headers?.get?.('x-forwarded-for') || 'anon';
    key = Array.isArray(ip)? ip[0]: String(ip).split(',')[0];
  } catch {}
  const now = Date.now();
  const entry = bucket[key] || { count:0, reset: now + WINDOW_MS };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + WINDOW_MS; }
  entry.count++;
  bucket[key] = entry;
  if (entry.count > LIMIT){
    return new Response(JSON.stringify({ ok:false, error:'RATE_LIMIT', retryAfter: entry.reset - now, fallback: basicSummary(snapshot) }), { status: 200 });
  }

  if (!apiKey){
    return new Response(JSON.stringify({ ok: false, error: 'AI_DISABLED', fallback: basicSummary(snapshot) }), { status: 200 });
  }

  const prompt = buildPrompt(scope, question, snapshot);
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an assistant summarizing interaction feature metrics. Provide plain language, avoid medical diagnosis, note uncertainty.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    if (!resp.ok){
      const text = await resp.text();
      return new Response(JSON.stringify({ ok:false, error: 'API_ERROR', detail: text, fallback: basicSummary(snapshot) }), { status: 200 });
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ ok:true, content }), { status: 200 });
  } catch (e:any){
    return new Response(JSON.stringify({ ok:false, error: 'NETWORK', detail: String(e), fallback: basicSummary(snapshot) }), { status: 200 });
  }
}

function buildPrompt(scope: string, question: string | undefined, snapshot: any): string {
  if (scope === 'qa' && question){
    return `Given the following aggregated metrics (non-identifying): ${JSON.stringify(snapshot)}\nQuestion: ${question}\nAnswer plainly and avoid medical claims.`;
  }
  return `Summarize these aggregated interaction metrics for a general audience (no medical claims): ${JSON.stringify(snapshot)}`;
}

function basicSummary(snapshot: any): string {
  if (!snapshot || !snapshot.similarity) return 'Collecting data; insufficient information yet.';
  const s = snapshot.similarity.overall;
  if (s > 0.85) return 'Current pattern is very consistent with baseline.';
  if (s > 0.65) return 'Current pattern shows mild variation from baseline.';
  return 'Noticeable deviation from baseline pattern at this time.';
}
