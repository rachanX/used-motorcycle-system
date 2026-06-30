import { createClient } from '@supabase/supabase-js';

const supabase = createClient<any>('http://localhost', 'anon');
const query = supabase.from('users').update({ full_name: 'test' });
