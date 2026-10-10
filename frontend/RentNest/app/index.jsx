import { Redirect } from 'expo-router';

// Redirect waits until the root layout is mounted; calling router.replace in an
// effect here throws "Attempted to navigate before mounting the Root Layout".
export default function Index() {
  return <Redirect href="/LandingScreen" />;
}
