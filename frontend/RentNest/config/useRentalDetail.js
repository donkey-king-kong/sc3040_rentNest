import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { rentalDetailCache } from './rentalDetails';

const idle = Object.freeze({ data: null, loading: false, error: null, status: null,
  unauthenticated: false, updatedAt: null, stale: true });
const disabledResource = {
  getSnapshot: () => idle, subscribe: () => () => {}, cancel: () => {},
  refresh: async () => null,
};

export function useRentalDetail(key, enabled = true, revision = null) {
  const router = useRouter();
  const resource = useMemo(() => key ? rentalDetailCache.resource(key) : disabledResource, [key]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const [verifiedResource, setVerifiedResource] = useState(null);
  const refresh = useCallback(async (reason = 'manual') => {
    setVerifiedResource(null);
    if (!key || !enabled) return null;
    const result = await resource.refresh(reason);
    if (result) setVerifiedResource(resource);
    return result;
  }, [resource, key, enabled]);

  useFocusEffect(useCallback(() => {
    if (!key || !enabled) return;
    refresh('focus');
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active') refresh('focus');
    });
    return () => {
      listener.remove();
      resource.cancel();
      setVerifiedResource(null);
    };
  }, [resource, refresh, key, enabled, revision]));

  useEffect(() => {
    if (state.unauthenticated) router.replace('/LoginScreen');
  }, [state.unauthenticated, router]);

  return {
    ...(enabled ? state : idle),
    error: !enabled ? null : key ? state.error : 'Invalid property or tenant link. Go back and select it again.',
    verified: enabled && verifiedResource === resource && !state.stale && !state.loading,
    refresh,
  };
}
