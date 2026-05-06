// ===== Supabase Config =====
// Replace these with your actual Supabase project values
const SUPABASE_URL = 'https://hcgfoaghvbuwjqksucsx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZ2ZvYWdodmJ1d2pxa3N1Y3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjczNTAsImV4cCI6MjA5MzY0MzM1MH0.oSr9AtFz4UnItewLVjcUDj6G_1PciMCTEOptyerLks0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Claude API is called via the Supabase Edge Function proxy
const CLAUDE_PROXY_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`;
