import { supabaseAdmin } from '../src/lib/supabase.js';

async function checkTeamMembers() {
  try {
    console.log('🔍 Checking team members...\n');

    // Find Краси Кътев's profile
    const { data: krasiProfile, error: krasiError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('full_name', '%Краси%Кътев%')
      .single();

    if (krasiError || !krasiProfile) {
      console.log('❌ Краси Кътев not found in profiles');
      console.log('Error:', krasiError?.message);
      return;
    }

    console.log('✅ Found Краси Кътев:', krasiProfile.full_name, `(ID: ${krasiProfile.id})`);

    // Find team led by Краси Кътев
    const { data: krasiTeam, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('leader_id', krasiProfile.id)
      .single();

    if (teamError || !krasiTeam) {
      console.log('❌ No team found for Краси Кътев');
      console.log('Error:', teamError?.message);
      return;
    }

    console.log('✅ Found team:', krasiTeam.name, `(ID: ${krasiTeam.id})`);

    // Find all realtors in this team
    const { data: teamRealtors, error: realtorsError } = await supabaseAdmin
      .from('realtors')
      .select(`
        *,
        profile:profiles!realtors_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('team_id', krasiTeam.id);

    if (realtorsError) {
      console.log('❌ Error fetching realtors:', realtorsError.message);
      return;
    }

    console.log(`\n📊 Team members (${teamRealtors?.length || 0}):`);
    if (teamRealtors && teamRealtors.length > 0) {
      teamRealtors.forEach((realtor, index) => {
        console.log(`  ${index + 1}. ${realtor.profile?.full_name || 'Unknown'} (Level: ${realtor.level})`);
      });
    } else {
      console.log('  ⚠️  No members in team');
    }

    // Check if Георги Калушев exists
    console.log('\n🔍 Checking for Георги Калушев...');
    const { data: georgiProfiles, error: georgiError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or('full_name.ilike.%Георги%Калушев%,full_name.ilike.%Георги%калушев%');

    if (georgiError) {
      console.log('❌ Error searching for Георги Калушев:', georgiError.message);
      return;
    }

    if (!georgiProfiles || georgiProfiles.length === 0) {
      console.log('❌ Георги Калушев not found in profiles');
    } else {
      console.log(`✅ Found ${georgiProfiles.length} profile(s) matching Георги Калушев:`);
      for (const profile of georgiProfiles) {
        console.log(`  - ${profile.full_name} (ID: ${profile.id}, Email: ${profile.email})`);

        // Check if this profile has a realtor record
        const { data: realtor, error: realtorError } = await supabaseAdmin
          .from('realtors')
          .select('*, team:teams(*)')
          .eq('user_id', profile.id)
          .single();

        if (realtorError || !realtor) {
          console.log(`    ⚠️  No realtor record found for this profile`);
        } else {
          console.log(`    ✅ Realtor record found:`);
          console.log(`       - Team ID: ${realtor.team_id || 'NULL (not assigned to any team)'}`);
          if (realtor.team) {
            console.log(`       - Team Name: ${realtor.team.name}`);
            console.log(`       - Team Leader ID: ${realtor.team.leader_id || 'NULL'}`);
            if (realtor.team.leader_id === krasiProfile.id) {
              console.log(`       ✅ This realtor IS in Краси Кътев's team`);
            } else {
              console.log(`       ❌ This realtor is NOT in Краси Кътев's team`);
              console.log(`       💡 Should we move them to Краси Кътев's team?`);
            }
          } else {
            console.log(`       ❌ Realtor is not assigned to any team`);
            console.log(`       💡 Should we assign them to Краси Кътев's team?`);
          }
        }
      }
    }

    // List all teams to help debug
    console.log('\n📋 All teams in the system:');
    const { data: allTeams, error: allTeamsError } = await supabaseAdmin
      .from('teams')
      .select(`
        *,
        leader:profiles!teams_leader_id_fkey (
          full_name
        ),
        office:offices (
          name
        )
      `)
      .order('name');

    if (!allTeamsError && allTeams) {
      allTeams.forEach((team, index) => {
        console.log(`  ${index + 1}. ${team.name}`);
        console.log(`     Leader: ${team.leader?.full_name || 'No leader'}`);
        console.log(`     Office: ${team.office?.name || 'Unknown'}`);
        console.log(`     ID: ${team.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTeamMembers()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


