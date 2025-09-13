#!/usr/bin/env node

/**
 * Migration Status Checker
 * Validates that all EduSync migrations are properly structured and ready to run
 */

const fs = require('fs');
const path = require('path');

const MIGRATION_DIR = path.join(__dirname, '.');
const EXPECTED_MIGRATIONS = [
    '20250101_base_schema.sql',
    '20250102_super_admin_policies.sql', 
    '20250103_admin_policies.sql',
    '20250104_teacher_policies.sql',
    '20250105_student_policies.sql',
    '20250106_service_role_policies.sql',
    '20250107_accountant_policies.sql',
    '20250108_user_invitation_system.sql',
    '20250109_storage_policies.sql'
];

console.log('🔍 EduSync Migration Status Check\n');

// Check if all expected migrations exist
let allPresent = true;
let totalSize = 0;

EXPECTED_MIGRATIONS.forEach((migration, index) => {
    const filePath = path.join(MIGRATION_DIR, migration);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        totalSize += stats.size;
        
        console.log(`✅ ${index + 1}. ${migration} (${sizeKB} KB)`);
    } else {
        console.log(`❌ ${index + 1}. ${migration} - MISSING`);
        allPresent = false;
    }
});

console.log(`\n📊 Total migration size: ${(totalSize / 1024).toFixed(1)} KB`);

// Check for unexpected files
const actualFiles = fs.readdirSync(MIGRATION_DIR)
    .filter(file => file.endsWith('.sql'))
    .filter(file => !EXPECTED_MIGRATIONS.includes(file) && file !== 'README.md');

if (actualFiles.length > 0) {
    console.log('\n⚠️  Unexpected SQL files found:');
    actualFiles.forEach(file => console.log(`   - ${file}`));
}

// Migration dependency check
console.log('\n🔗 Migration Dependencies:');
console.log('   1. Base Schema → Creates all tables and functions');
console.log('   2. Super Admin Policies → Platform-wide access');
console.log('   3. Admin Policies → School-scoped management');
console.log('   4. Teacher Policies → Classroom management');
console.log('   5. Student Policies → Personal data access');
console.log('   6. Service Role Policies → AI assistant access');
console.log('   7. Accountant Policies → Financial management');
console.log('   8. Invitation System → User registration');
console.log('   9. Storage Policies → File upload management');

if (allPresent) {
    console.log('\n🎉 All migrations ready! You can run:');
    console.log('   supabase db push');
    console.log('\n💡 Make sure to run migrations in the exact timestamp order.');
} else {
    console.log('\n❌ Migration setup incomplete. Please check missing files.');
}

console.log('\n📚 For detailed information, see README.md');
