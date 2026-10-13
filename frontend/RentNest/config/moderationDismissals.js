import { useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

const TYPES = ['users', 'reviews', 'listings'];

const entries = Object.fromEntries(TYPES.map(type => [type, new Map()]));
const listeners = Object.fromEntries(TYPES.map(type => [type, new Set()]));
const completionVersions = Object.fromEntries(TYPES.map(type => [type, 0]));
const snapshots = {};

const normalizeId = id => String(id);

const publish = type => {
  snapshots[type] = {
    pendingIds: Array.from(entries[type].keys()),
    completionVersion: completionVersions[type],
  };
  listeners[type].forEach(listener => listener());
};

TYPES.forEach(publish);

const begin = (type, id) => {
  const normalizedId = normalizeId(id);
  if (entries[type].has(normalizedId)) return false;

  entries[type].set(normalizedId, 'pending');
  publish(type);
  return true;
};

const confirm = (type, id) => {
  const normalizedId = normalizeId(id);
  if (!entries[type].has(normalizedId)) return;

  entries[type].set(normalizedId, 'confirmed');
  completionVersions[type] += 1;
  publish(type);
};

const fail = (type, id) => {
  if (entries[type].delete(normalizeId(id))) publish(type);
};

const failureMessage = error => {
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage;
  }

  return error?.response
    ? "The report couldn't be dismissed. Please try again."
    : "Couldn't reach the server. Check your connection and try again.";
};

export const moderationDismissals = {
  subscribe(type, listener) {
    listeners[type].add(listener);
    return () => listeners[type].delete(listener);
  },

  getSnapshot(type) {
    return snapshots[type];
  },

  isPending(type, id) {
    return entries[type].has(normalizeId(id));
  },

  reconcile(type, visibleIds) {
    const visible = new Set(visibleIds.map(normalizeId));
    let changed = false;

    entries[type].forEach((status, id) => {
      if (status === 'confirmed' && !visible.has(id)) {
        entries[type].delete(id);
        changed = true;
      }
    });

    if (changed) publish(type);
  },

  reset() {
    TYPES.forEach(type => {
      entries[type].clear();
      completionVersions[type] = 0;
      publish(type);
    });
  },
};

export const useModerationDismissals = type => useSyncExternalStore(
  listener => moderationDismissals.subscribe(type, listener),
  () => moderationDismissals.getSnapshot(type),
  () => moderationDismissals.getSnapshot(type),
);

export const startOptimisticDismissal = ({
  type,
  id,
  itemLabel,
  request,
}) => {
  const execute = () => {
    let result;

    try {
      result = request();
    } catch (error) {
      result = Promise.reject(error);
    }

    Promise.resolve(result)
      .then(() => confirm(type, id))
      .catch(error => {
        fail(type, id);
        Alert.alert(
          `Unable to dismiss ${itemLabel}`,
          failureMessage(error),
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => {
                if (begin(type, id)) execute();
              },
            },
          ],
        );
      });
  };

  if (!begin(type, id)) return false;
  execute();
  return true;
};
