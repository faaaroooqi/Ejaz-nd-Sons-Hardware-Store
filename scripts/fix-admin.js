import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local if present
let envUrl = 'https://qoltrmloasgawxwycmbt.supabase.co'
let envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2]

try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        envUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim()
      }
      if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        envServiceKey = trimmed.replace('SUPABASE_SERVICE_ROLE_KEY=', '').trim()
      }
    }
  }
} catch (e) {
  // Ignore env read error
}

if (!envServiceKey) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: No Supabase Service Role key provided.')
  console.log('\nUsage:')
  console.log('  node scripts/fix-admin.js <YOUR_SERVICE_ROLE_KEY>')
  console.log('  OR add SUPABASE_SERVICE_ROLE_KEY=your_key into .env.local\n')
  process.exit(1)
}

const supabase = createClient(envUrl, envServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('Connecting to Supabase at:', envUrl)

  // 1. Get the admin role ID
  const { data: roles, error: rolesErr } = await supabase
    .from('roles')
    .select('id, code, name')
    .eq('code', 'admin')
    .single()

  if (rolesErr || !roles) {
    console.error('Failed to query roles:', rolesErr)
    process.exit(1)
  }

  console.log(`Found Admin Role: ${roles.name} (${roles.id})`)

  // 2. Update admin@hardware.com profile
  const { data: updatedProfile, error: updateErr } = await supabase
    .from('profiles')
    .update({
      role_id: roles.id,
      is_active: true,
      full_name: 'System Admin',
    })
    .eq('email', 'admin@hardware.com')
    .select()

  if (updateErr) {
    console.error('Failed to update admin profile:', updateErr)
    process.exit(1)
  }

  console.log('\x1b[32m%s\x1b[0m', 'Successfully updated admin@hardware.com profile to Admin role!')
  console.log(updatedProfile)

  // 3. Update auth metadata
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers()
  if (!usersErr && usersData?.users) {
    const adminUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === 'admin@hardware.com'
    )
    if (adminUser) {
      await supabase.auth.admin.updateUserById(adminUser.id, {
        app_metadata: { role: 'admin' },
      })
      console.log('\x1b[32m%s\x1b[0m', 'Updated auth user app_metadata to admin!')
    }
  }

  console.log('\nAll done! You can now reload your web application and add products/categories freely.')
}

run().catch(console.error)
