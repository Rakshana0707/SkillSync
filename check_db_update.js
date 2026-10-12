const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function test() {
  const { data, error } = await supabase.from('profiles').update({ avatar_url: '🦊' }).eq('username', 'niviii_08');
  console.log(JSON.stringify({data, error}, null, 2));
}

test();
