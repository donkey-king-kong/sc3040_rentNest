import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';

import { API_BASE_URL } from '../config/api';
import { AdminHeader, AdminLoadingState } from '../components/AdminUI';

const EMPTY_COUNTS = {
  reviews: null,
  users: null,
  listings: null,
};

const AdminScreen = () => {
  const router = useRouter();
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const formatLastUpdated = (date) => {
    if (!date) {
      return 'Last updated --';
    }

    return `Last updated ${date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const fetchFlaggedCount = async (endpoint, token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!Array.isArray(response.data)) throw new Error('Unexpected report response');
      return response.data.length;
    } catch (error) {
      console.log(`Failed to fetch ${endpoint}:`, error.message);
      return null;
    }
  };

  const fetchFlaggedCounts = async ({ initial = false } = {}) => {
    if (initial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        router.replace('/LoginScreen');
        return;
      }

      const [reviews, users, listings] = await Promise.all([
        fetchFlaggedCount('/api/reviews/admin/flagged', token),
        fetchFlaggedCount('/api/users/admin/flagged', token),
        fetchFlaggedCount('/api/listings/admin/flagged', token),
      ]);

      setCounts({ reviews, users, listings });
      setLastUpdated([reviews, users, listings].every(value => value !== null) ? new Date() : null);
    } catch (error) {
      setCounts(EMPTY_COUNTS);
      setLastUpdated(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFlaggedCounts({ initial: true });
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      "You'll need to sign in again to access the admin panel.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['token', 'userId']);
              router.replace('/LandingScreen');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ],
    );
  };

  const navigationCards = [
    {
      title: 'Platform Analytics',
      description: 'Users, payments and moderation at a glance',
      route: '/AdminAnalyticsScreen',
      icon: 'bar-chart',
      styles: { iconWrap: styles.listingIconWrap, icon: '#175CD3' },
    },
    {
      title: 'Reviews',
      description: 'Flagged reviews pending action',
      count: counts.reviews,
      route: '/ProcessReviewsScreen',
      icon: 'flag',
      styles: {
        activeCard: styles.reviewCardActive,
        iconWrap: styles.reviewIconWrap,
        icon: '#B42318',
        badge: styles.reviewBadge,
        badgeText: styles.reviewBadgeText,
      },
    },
    {
      title: 'Users',
      description: 'Reported accounts to review',
      count: counts.users,
      route: '/BanUserScreen',
      icon: 'user',
      hasAlertDot: true,
      styles: {
        activeCard: styles.userCardActive,
        iconWrap: styles.userIconWrap,
        icon: '#B54708',
        badge: styles.userBadge,
        badgeText: styles.userBadgeText,
      },
    },
    {
      title: 'Listings',
      description: 'Flagged listings to review',
      count: counts.listings,
      route: '/ReviewListingScreen',
      icon: 'home',
      styles: {
        activeCard: styles.listingCardActive,
        iconWrap: styles.listingIconWrap,
        icon: '#175CD3',
        badge: styles.listingBadge,
        badgeText: styles.listingBadgeText,
      },
    },
  ];

  if (isLoading) return <AdminLoadingState backgroundColor="#FFFFFF" />;

  const hasUnavailable = Object.values(counts).some(value => value === null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <AdminHeader title="Admin dashboard" inset />

        <View style={styles.metaRow}>
          <Text style={styles.lastUpdatedText}>
            {hasUnavailable ? 'Counts unavailable' : formatLastUpdated(lastUpdated)}
          </Text>
          <TouchableOpacity
            style={[styles.refreshLink, isRefreshing && styles.refreshButtonDisabled]}
            activeOpacity={0.8}
            onPress={() => fetchFlaggedCounts()}
            disabled={isRefreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh report counts"
          >
            <FontAwesome name="refresh" size={14} color="#16794B" />
            <Text style={styles.refreshText}>{isRefreshing ? 'Refreshing' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasUnavailable && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorMessage}>Some report counts couldn't be loaded.</Text>
          <TouchableOpacity onPress={() => fetchFlaggedCounts()} disabled={isRefreshing}
            accessibilityRole="button" accessibilityLabel="Retry report counts" style={styles.retryButton}>
            <Text style={styles.retryText}>{isRefreshing ? 'Retrying...' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cardList}>
        {navigationCards.map((card) => {
          const hasPending = card.count > 0;

          return (
            <TouchableOpacity
              key={card.title}
              style={[styles.navCard, hasPending && card.styles.activeCard]}
              activeOpacity={0.85}
              onPress={() => router.push(card.route)}
            >
              <View style={[styles.cardIconWrap, card.styles.iconWrap]}>
                <FontAwesome name={card.icon} size={24} color={card.styles.icon} />
                {card.hasAlertDot && (
                  <View style={styles.userAlertBadge}>
                    <Text style={styles.userAlertText}>!</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>

              {card.count !== undefined && (
                <View style={[styles.countBadge, hasPending ? card.styles.badge : styles.mutedBadge]}>
                  <Text style={[styles.countBadgeText, hasPending ? card.styles.badgeText : styles.mutedBadgeText, card.count === null && { fontSize: 12 }]}>
                    {card.count === null ? 'Unavailable' : card.count}
                  </Text>
                </View>
              )}

              <FontAwesome name="chevron-right" size={18} color="#8E8E93" />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.separator} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <FontAwesome name="sign-out" size={20} color="black" style={styles.icon} />
        <Text style={styles.logoutText}>Log out</Text>
        <FontAwesome name="chevron-right" size={18} color="#8E8E93" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 28,
  },
  headerContainer: {
    marginBottom: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#666A70',
  },
  refreshLink: {
    minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshText: { fontSize: 12, fontWeight: '600', color: '#16794B' },
  errorBanner: { padding: 12, marginBottom: 16, backgroundColor: '#FEF3F2', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorMessage: { flex: 1, color: '#B42318', fontSize: 14 },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  retryText: { color: '#B42318', fontWeight: '700' },
  cardList: {
    gap: 14,
  },
  navCard: {
    minHeight: 104,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  reviewCardActive: {
    borderColor: '#FDA29B',
    borderWidth: 1.5,
  },
  userCardActive: {
    borderColor: '#FDB022',
    borderWidth: 1.5,
  },
  listingCardActive: {
    borderColor: '#84CAFF',
    borderWidth: 1.5,
  },
  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  reviewIconWrap: {
    backgroundColor: '#FEE4E2',
  },
  userIconWrap: {
    backgroundColor: '#FEF0C7',
  },
  listingIconWrap: {
    backgroundColor: '#D1E9FF',
  },
  userAlertBadge: {
    position: 'absolute',
    right: 11,
    bottom: 12,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B54708',
    borderWidth: 2,
    borderColor: '#FEF0C7',
  },
  userAlertText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  cardCopy: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#101820',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666A70',
  },
  countBadge: {
    minWidth: 34,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginRight: 12,
  },
  reviewBadge: {
    backgroundColor: '#FEF3F2',
  },
  userBadge: {
    backgroundColor: '#FFFAEB',
  },
  listingBadge: {
    backgroundColor: '#EFF8FF',
  },
  mutedBadge: {
    backgroundColor: '#F2F4F7',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewBadgeText: {
    color: '#B42318',
  },
  userBadgeText: {
    color: '#B54708',
  },
  listingBadgeText: {
    color: '#175CD3',
  },
  mutedBadgeText: {
    color: '#667085',
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  logoutButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: 'black',
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
});

export default AdminScreen;
