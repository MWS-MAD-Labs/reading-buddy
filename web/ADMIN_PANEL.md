# Admin Panel Documentation

## Overview

The Admin Panel provides comprehensive user management capabilities for the Reading Buddy application. Only users with the `ADMIN` role can access this panel.

## Access

Navigate to: `/dashboard/admin`

## Features

### 1. User Table Display

The admin panel displays all users with the following columns:

- **Name** - User's full name
- **Email** - User's email address (from auth system)
- **Role** - User's role badge (STUDENT, TEACHER, LIBRARIAN, ADMIN)
- **Access Level** - For students only, shows their reading level access
  - Staff roles (TEACHER, LIBRARIAN, ADMIN) automatically have access to all content
  - Shows "—" for non-student roles
- **Actions** - Edit and Delete buttons

### 2. Search Functionality

Search bar allows filtering users by:
- Name
- Email
- Role
- Access Level

The search is case-insensitive and updates results in real-time.

### 3. Add User

Click the "Add User" button to manually create a new user.

**Required Fields:**
- Email (unique)
- Password (minimum 6 characters)
- Role (STUDENT, TEACHER, LIBRARIAN, ADMIN)

**Optional Fields:**
- Full Name
- Access Level (only for STUDENT role)

**Access Level Options (for students):**
- Kindergarten
- Lower Elementary
- Upper Elementary
- Junior High
- Teachers / Staff

**Note:** Staff roles (TEACHER, LIBRARIAN, ADMIN) automatically have access to all content regardless of access level setting.

### 4. Edit User

Click the pencil icon to edit an existing user.

**Editable Fields:**
- Full Name
- Role
- Access Level (only shown if role is STUDENT)

**Non-editable Fields:**
- Email (cannot be changed after account creation)

### 5. Delete User

Click the trash icon to delete a user.

**Important Notes:**
- Confirmation dialog will appear
- You cannot delete your own admin account
- This action is permanent and cannot be undone
- Deletes both the auth user and profile data

### 6. Bulk Upload

Click the "Bulk Upload" button to upload multiple users via CSV file.

#### CSV Format

The CSV file must include the following columns:
- `email` (required)
- `password` (required, min 6 characters)
- `full_name` (optional)
- `role` (required: STUDENT, TEACHER, LIBRARIAN, or ADMIN)
- `access_level` (optional, only used for STUDENT role)

#### Sample CSV

```csv
email,password,full_name,role,access_level
student1@school.com,password123,John Doe,STUDENT,LOWER_ELEMENTARY
teacher1@school.com,password123,Jane Smith,TEACHER,
librarian1@school.com,password123,Bob Johnson,LIBRARIAN,
student2@school.com,password123,Alice Williams,STUDENT,UPPER_ELEMENTARY
admin1@school.com,password123,Admin User,ADMIN,
```

#### Download Sample Template

Click "Download Sample CSV Template" in the bulk upload modal to get a pre-formatted template file.

#### Bulk Upload Behavior

- **Existing Users:** If an email already exists, the system will UPDATE the user's profile data (name, role, access_level)
- **New Users:** If an email doesn't exist, the system will CREATE a new user with auth account and profile
- **Error Handling:** The system will continue processing even if some rows fail, and will provide a detailed error report
- **Results:** Shows count of successful and failed operations with error details

## Access Level System

### How It Works

1. **Students** have specific access levels that determine which books they can read
   - Books are tagged with access levels
   - Students can only access books matching their access level
   - Access levels: KINDERGARTEN, LOWER_ELEMENTARY, UPPER_ELEMENTARY, JUNIOR_HIGH, TEACHERS_STAFF

2. **Staff** (TEACHER, LIBRARIAN, ADMIN) have unrestricted access
   - Can access all books regardless of access level
   - Access level field is not used for staff roles
   - Automatically get full system access

### Setting Access Levels

- **During User Creation:** Set access level when adding a student
- **During Edit:** Change access level for existing students
- **Via Bulk Upload:** Include access_level column in CSV (leave empty for staff)

## Technical Details

### Database Schema

**profiles table:**
```sql
- id (uuid, references auth.users)
- full_name (text, nullable)
- role (text) -- STUDENT | TEACHER | LIBRARIAN | ADMIN
- access_level (text, nullable) -- Only used for students
- points (integer)
- updated_at (timestamp)
```

### Server Actions

Located in: `web/src/app/(dashboard)/dashboard/admin/actions.ts`

**Available Actions:**
- `updateUserRole()` - Update user's role
- `updateUserAccessLevel()` - Update user's access level
- `updateUserData()` - Update multiple user fields at once
- `addUser()` - Create new user with auth account and profile
- `deleteUser()` - Delete user's auth account and profile
- `bulkUploadUsers()` - Process CSV file and create/update multiple users

### Components

**Main Components:**
- `AdminUserTable.tsx` - Main table with search and action buttons
- `AddUserModal.tsx` - Modal for creating new users
- `EditUserModal.tsx` - Modal for editing existing users
- `BulkUploadModal.tsx` - Modal for CSV bulk upload

**Location:** `web/src/components/dashboard/`

### Icons

Uses `@heroicons/react` for all icons:
- `MagnifyingGlassIcon` - Search
- `UserPlusIcon` - Add User
- `ArrowUpTrayIcon` - Bulk Upload
- `PencilIcon` - Edit
- `TrashIcon` - Delete
- `XMarkIcon` - Close modals
- `ArrowDownTrayIcon` - Download template
- `DocumentArrowUpIcon` - Upload file

## Security

### Access Control

- Only users with `ADMIN` role can access `/dashboard/admin`
- Role checking happens server-side using `requireRole(['ADMIN'])`
- All server actions verify user authentication before execution
- Uses Supabase Admin client for privileged operations

### Password Requirements

- Minimum 6 characters (enforced by Supabase)
- Passwords are hashed by Supabase Auth
- Admin cannot see existing passwords

### Data Validation

- Email format validation
- Role must be one of: STUDENT, TEACHER, LIBRARIAN, ADMIN
- Access level must be valid enum value or null
- CSV parsing includes error handling for malformed data

## Troubleshooting

### "You must be signed in" Error

**Cause:** Session expired or invalid
**Solution:** Refresh the page and log in again

### "Failed to create user: Email already exists"

**Cause:** Attempting to add a user with an existing email
**Solution:** Use a different email address or edit the existing user

### CSV Upload Fails

**Common Issues:**
1. Missing required columns (email, password, role)
2. Invalid role values (must be uppercase: STUDENT, TEACHER, LIBRARIAN, ADMIN)
3. Invalid access level values
4. Malformed CSV file

**Solution:**
- Download and use the sample template
- Ensure all required fields are filled
- Check for proper CSV formatting (commas, no extra quotes)
- Review error details in the upload results

### Cannot Delete User

**Possible Causes:**
1. Trying to delete your own account
2. User is referenced in other tables (books, classes, etc.)

**Solution:**
- For your own account: Use a different admin account or contact system administrator
- For referenced users: Remove references first or contact database administrator

## Best Practices

1. **Bulk Upload**
   - Use bulk upload for onboarding many students at once
   - Test with a small CSV file first
   - Keep a backup of your CSV file
   - Review error messages and fix issues row by row

2. **Access Levels**
   - Set appropriate access levels for students based on their reading level
   - Review and update access levels as students progress
   - Staff roles don't need access levels

3. **User Management**
   - Regularly review and clean up inactive accounts
   - Use clear, descriptive names
   - Follow your organization's email format conventions

4. **Security**
   - Use strong passwords when manually creating accounts
   - Don't share admin credentials
   - Regularly audit user roles and access

## Sample Workflows

### Onboarding New Students

1. Prepare a CSV file with student information
2. Click "Bulk Upload"
3. Download sample template if needed
4. Fill in student data (email, password, name, role=STUDENT, access_level)
5. Upload the CSV file
6. Review results and fix any errors
7. Re-upload for failed entries if needed

### Changing a Student's Reading Level

1. Use search bar to find the student
2. Click the edit (pencil) icon
3. Select new Access Level from dropdown
4. Click "Save Changes"

### Promoting a Teacher to Admin

1. Find the teacher in the user list
2. Click edit icon
3. Change Role to "ADMIN"
4. Click "Save Changes"
5. Teacher will immediately have admin access

### Creating a Single New User

1. Click "Add User" button
2. Fill in email and password (required)
3. Enter full name (optional)
4. Select role
5. If student, select access level
6. Click "Create User"

## Support

For technical issues or questions:
- Check the main README.md file
- Review server logs for error details
- Contact your system administrator
