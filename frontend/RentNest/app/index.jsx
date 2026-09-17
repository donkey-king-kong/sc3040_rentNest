import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady) {
      // Automatically redirect to the Landing Screen once the layout is ready
      router.replace('/LandingScreen');
    }
  }, [isReady]);

  return (
    <View
      style={{ flex: 1 }}
      onLayout={() => setIsReady(true)} // Set isReady to true when the layout is ready
    />
  );
}

