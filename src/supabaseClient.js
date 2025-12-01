import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnlwazajfxbglagerjzs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubHdhemFqZnhiZ2xhZ2VyanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDAwMzksImV4cCI6MjA3OTgxNjAzOX0.7MLqEXmLPTIBQSrBJ0f-SPcCsQ0r_69-Rrw_mCq3psc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)