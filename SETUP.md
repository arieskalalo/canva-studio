# CANVA Studio — Setup Guide

## 1. Create a Supabase Project
Go to https://supabase.com and create a new project.

## 2. Configure `js/config.js`
Replace the placeholder values:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```
Find these in: Supabase Dashboard → Project Settings → API.

## 3. Run the Database Schema
In Supabase Dashboard → SQL Editor, paste and run the contents of `supabase/schema.sql`.

## 4. Deploy the Claude Proxy Edge Function
```bash
cd "C:/Users/User/Documents/Claude Projects/CANVA"
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key
npx supabase functions deploy claude-proxy
```

## 5. Deploy to GitHub Pages
```bash
git init
git add .
git commit -m "Initial CANVA Studio"
gh repo create canva-studio --public --push --source=.
```
Then in GitHub → Settings → Pages → Source: Deploy from branch `main`.

## Features Built
- Core editor: shapes, text, freehand draw, image upload
- Undo/Redo (50 steps), keyboard shortcuts
- Layers panel
- Properties panel (fill, stroke, text, opacity, arrange)
- Brand Kit (colors, fonts, logo → Supabase)
- Design Versioning / Snapshots
- Batch Variant Generator (text + color variants)
- Smart Resize (proportional rescale for any format)
- Mockup Wrapper (phone, tablet, laptop, billboard, poster, t-shirt)
- Export: PNG, JPG, SVG, PDF, Vidspark JSON
- AI Layout Generator (Claude API)
- AI Copywriter (Claude API)
- AI Image Generation (Pollinations.ai — free)
- Background Removal (@imgly/background-removal — free, client-side)
- Auto-save every 2 minutes
