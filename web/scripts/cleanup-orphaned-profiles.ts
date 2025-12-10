import { cleanupOrphanedProfiles } from '../src/app/(dashboard)/dashboard/admin/actions';

async function main() {
  console.log('Starting cleanup of orphaned profiles...\n');
  
  const result = await cleanupOrphanedProfiles();
  
  if (result.success) {
    console.log(`✅ Success! Removed ${result.removed} orphaned profile(s)`);
    if (result.orphanedIds.length > 0) {
      console.log('\nOrphaned profile IDs removed:');
      result.orphanedIds.forEach(id => console.log(`  - ${id}`));
    } else {
      console.log('\nNo orphaned profiles found.');
    }
  } else {
    console.error(`❌ Error: ${result.error}`);
    if (result.orphanedIds.length > 0) {
      console.log('\nOrphaned profile IDs found but not removed:');
      result.orphanedIds.forEach(id => console.log(`  - ${id}`));
    }
  }
}

main().catch(console.error);
