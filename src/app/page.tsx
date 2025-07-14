import { redirect } from 'next/navigation';

export default function RootPage() {
  // Permanently redirect the user from the root to the portals selection page.
  redirect('/portals');
}
