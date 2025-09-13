# Database Migration Guide

This document explains the new organized database migration structure for EduSync, designed to replace the fragmented SQL files with a clean, role-based approach.

## Migration Files Overview

### 📁 supabase/migrations/

The migrations are organized chronologically and by purpose:

1. **`20250101_base_schema.sql`** - Core Database Schema
2. **`20250102_super_admin_policies.sql`** - Super Admin Access Policies  
3. **`20250103_admin_policies.sql`** - School Admin Access Policies
4. **`20250104_teacher_policies.sql`** - Teacher Access Policies
5. **`20250105_student_policies.sql`** - Student Access Policies
6. **`20250106_service_role_policies.sql`** - AI Assistant & Automation Policies
7. **`20250107_accountant_policies.sql`** - Accountant Access Policies
8. **`20250108_user_invitation_system.sql`** - User Registration & Role Assignment
9. **`20250109_storage_policies.sql`** - File Upload & Storage Policies

## 🗄️ Database Schema

### Core Tables
- **schools** - Multi-tenant school information
- **user_roles** - Central role management (super_admin, admin, teacher, student, accountant)
- **teachers, students, admins, accountants** - Role-specific profile data
- **user_invitations** - Secure role-based user registration

### Academic Tables
- **academic_results** - Student grades and performance
- **attendance_records** - Student attendance tracking
- **staff_attendance** - Teacher attendance tracking
- **behavior_incidents** - Discipline tracking
- **assignments** - Homework and classwork
- **timetable_entries** - Class scheduling

### Financial Tables
- **platform_pricing** - Super admin managed pricing tiers
- **school_fees** - School-specific fee structure with platform fees
- **fee_payments** - Payment records with dual-gateway support
- **student_arrears** - Outstanding fee tracking
- **payment_transactions** - Platform fee collection tracking
- **platform_revenue** - Revenue analytics for super admins

### Communication Tables
- **school_announcements** - Internal school communications
- **news_posts** - Public school news and updates
- **admission_applications** - Student enrollment management

### System Tables
- **audit_logs** - System activity tracking
- **assistant_logs** - AI interaction logging

## 👥 Role-Based Access Control

### Super Admin (`super_admin`)
- **Platform Management**: Manage all schools, platform pricing, revenue tracking
- **Cross-School Visibility**: View data across all schools for analytics
- **System Administration**: User role management, system maintenance

### School Admin (`admin`)
- **School Management**: Full access to their school's data and settings
- **User Management**: Invite and manage teachers, students, accountants
- **Financial Oversight**: Fee structure, payment tracking, expenditures
- **Academic Oversight**: View all academic records and attendance

### Teacher (`teacher`)
- **Class Management**: Manage assigned students, grades, attendance
- **Assignment Management**: Create and manage homework/classwork
- **Behavior Tracking**: Record and manage behavior incidents
- **Communication**: Create announcements for students

### Student (`student`)
- **Personal Data**: View own academic records, attendance, fees
- **School Information**: Access school announcements, timetables
- **Financial Transparency**: View own payment history and arrears

### Accountant (`accountant`)
- **Financial Management**: Full access to school's financial data
- **Payment Processing**: Manage fee payments and student arrears
- **Budget Management**: Handle expenditures and budget categories
- **Financial Reporting**: Generate financial reports and analytics

### Service Role (`service_role`)
- **AI Assistant**: Read access to all data for AI processing
- **System Automation**: Automated tasks and data processing
- **Platform Operations**: Revenue tracking and system maintenance

## 🔄 Migration Process

### Running Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to your project
supabase login

# Run all migrations in order
supabase db push

# Or run individual migrations
supabase db push --include-all
```

### Migration Order (Important!)

The migrations must be run in the exact order specified by their timestamps:

1. **Base Schema** first (creates all tables and functions)
2. **Role Policies** in order (builds access controls layer by layer)
3. **Invitation System** (enables user registration)
4. **Storage Policies** last (handles file uploads)

## 🔐 Security Features

### Row Level Security (RLS)
- All tables have RLS enabled with role-appropriate policies
- Multi-tenant isolation ensures schools can only access their own data
- Helper functions (`get_my_role()`, `is_my_school_record()`) simplify policy logic

### Invitation-Based Registration
- Users can only be created through secure invitation system
- Role assignment is controlled by existing admins/super admins
- Automatic profile creation based on assigned role

### File Upload Security
- Bucket-specific access controls
- File size and type validation
- Role-based file visibility

## 🔧 Helper Functions

### User Management
```sql
-- Get current user's role
SELECT get_my_role();

-- Get current user's school
SELECT get_my_school_id();

-- Check if record belongs to user's school
SELECT is_my_school_record(school_id);
```

### Invitation Management
```sql
-- Create invitation (validates permissions automatically)
SELECT create_user_invitation('email@example.com', 'teacher', 1);

-- Cleanup expired invitations
SELECT cleanup_expired_invitations();
```

## 📊 Platform Pricing System

### Pricing Structure
- **Grade-based pricing**: Different rates for each grade level
- **Automatic fee calculation**: School fees = base fee + platform fee
- **Multi-gateway support**: Paystack and Stripe integration
- **Revenue tracking**: Automated platform revenue collection

### Fee Collection Flow
1. School sets base fees for each grade/term
2. Platform fees automatically added based on grade level
3. Parents pay total amount through payment gateway
4. Platform fee collected automatically
5. School receives remaining amount

## 🚀 Getting Started

### 1. Clean Migration
```bash
# Remove old schema (if exists)
supabase db reset

# Run new migrations
supabase db push
```

### 2. Create Initial Super Admin
```sql
-- Insert your user as super admin
INSERT INTO user_roles (user_id, role) 
VALUES ('your-auth-user-id', 'super_admin');
```

### 3. Set Up Platform Pricing
```sql
-- Platform pricing is automatically loaded
-- Modify as needed for your platform
UPDATE platform_pricing 
SET amount = 25.00 
WHERE grade_level = 'Primary 1';
```

### 4. Create Your First School
```sql
INSERT INTO schools (name, domain, email) 
VALUES ('Demo School', 'demo', 'admin@demo.school');
```

## 🔍 Troubleshooting

### Migration Issues
- **Order matters**: Run migrations in timestamp order
- **RLS conflicts**: Drop existing policies before running new migrations
- **Permission errors**: Ensure you have proper database permissions

### Policy Issues
- **Access denied**: Check user role assignment in `user_roles` table
- **Cross-school access**: Verify `school_id` matches in relevant tables
- **Service role**: Use `auth.role() = 'service_role'` for system operations

## 📈 Next Steps

1. **Run migrations** in your Supabase project
2. **Test each role** to ensure proper access control
3. **Set up platform pricing** according to your business model
4. **Configure payment gateways** in school settings
5. **Invite initial users** through the invitation system

---

**Note**: This new structure replaces all previous fragmented SQL files. The old `complete_schema_and_policies.sql`, `Auth_session.sql`, and other standalone files have been consolidated into this organized migration system.
