import { useRouter } from 'expo-router';
import SplashScreen from './SplashScreen';

export default function Index() {
  const router = useRouter();

  const handleSplashFinish = () => {
    router.replace('/LandingScreen');
  };

  return <SplashScreen onFinish={handleSplashFinish} />;
}
