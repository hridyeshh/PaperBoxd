import ClientPage from "./ClientPage";

// Force static rendering for Capacitor export
export const dynamic = 'force-static';

// Generate a single placeholder page for static export
// The ClientPage component resolves the actual params from the URL client-side
export async function generateStaticParams() {
  return [{ username: "_", listId: "_" }];
}

export default function Page() {
  return <ClientPage />;
}
