/**
 * (auth) route group layout.
 * Applied to all pages inside app/(auth)/ — login, signup, forgot-password, etc.
 * No Navbar here — auth pages are standalone full-screen pages.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {children}
    </div>
  );
}
