
import { redirect } from 'next/navigation';

// This is the root page of the application.
// In a multi-tenant SaaS application, the root page should not display a default school.
// Instead, it should guide users to their school's specific subdomain or path.
// For example, if a user lands on `yourapp.com`, they should be directed to `sjm.yourapp.com` or `yourapp.com/sjm`.
//
// For this project, we will redirect users from the root to the `/portals` page,
// which serves as a central login hub. This is a clear and user-friendly approach.

export default function RootPage() {
  redirect('/portals');
}
