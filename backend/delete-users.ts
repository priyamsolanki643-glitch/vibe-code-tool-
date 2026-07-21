import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const testDomains = ['synsky.com', 'afterdo.com', 'herojp.com', 'aspensif.com'];

async function cleanupTestUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  for (const user of data.users) {
    const isTest = testDomains.some(domain => user.email?.endsWith(`@${domain}`));
    if (isTest) {
      console.log(`Deleting test user: ${user.email} (${user.id})`);
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
      if (delError) {
        console.error(`Failed to delete ${user.email}:`, delError);
      } else {
        console.log(`Successfully deleted ${user.email}`);
      }
    }
  }
  console.log("Cleanup complete.");
}

cleanupTestUsers();
