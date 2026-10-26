import { createClient } from '@supabase/supabase-js'

const url = 'https://qoltrmloasgawxwycmbt.supabase.co'
const key = 'sb_publishable_0HnHUAZ1KB5HB6G0T07BDw_bheIEhPA'
const supabase = createClient(url, key)

async function test() {
  const { data, error } = await supabase.from('khata_imports').select('id').limit(1)
  console.log('Query khata_imports result:', { data, error })
}
test()
