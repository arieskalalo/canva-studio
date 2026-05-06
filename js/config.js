// ===== Supabase Config =====
// Replace these with your actual Supabase project values
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Claude API is called via the Supabase Edge Function proxy
const CLAUDE_PROXY_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`;
