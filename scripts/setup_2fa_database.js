const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup2FADatabase() {
  try {
    console.log('🚀 Setting up 2FA database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/setup_2fa_complete.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL content loaded');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      return;
    }
    
    console.log('✅ 2FA database setup completed successfully!');
    console.log('📊 Data:', data);
    
    // Test the setup
    console.log('\n🧪 Testing 2FA setup...');
    
    // Test 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_2fa_factors', 'user_2fa_challenges', 'user_2fa_attempts']);
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('✅ Tables check:', tables);
    }
    
    // Test 2: Try to insert a test factor
    const testFactor = {
      user_id: '00000000-0000-0000-0000-000000000001',
      friendly_name: 'Test 2FA Factor',
      factor_type: 'totp',
      status: 'unverified',
      secret: 'JBSWY3DPEHPK3PXP'
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('user_2fa_factors')
      .insert(testFactor)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting test factor:', insertError);
    } else {
      console.log('✅ Insert test successful:', insertResult);
    }
    
    // Test 3: Try to select from table
    const { data: selectResult, error: selectError } = await supabase
      .from('user_2fa_factors')
      .select('*')
      .limit(5);
    
    if (selectError) {
      console.error('❌ Error selecting from table:', selectError);
    } else {
      console.log('✅ Select test successful:', selectResult);
    }
    
    console.log('\n🎉 2FA database setup and testing completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setup2FADatabase(); 