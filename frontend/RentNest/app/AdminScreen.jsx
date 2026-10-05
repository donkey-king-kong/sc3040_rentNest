import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';

import { API_BASE_URL } from '../config/api';

const EMPTY_COUNTS = {
  reviews: 0,
  users: 0,
  listings: 0,
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

      return Array.isArray(response.data) ? response.data.length : 0;
    } catch (error) {
      console.log(`Failed to fetch ${endpoint}:`, error.message);
      return 0;
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
      setLastUpdated(new Date());
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2FA84F" />
        <Text style={styles.loadingText}>Loading flagged reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.header}>Admin</Text>
          <View style={styles.adminPill}>
            <Text style={styles.adminPillText}>Admin</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.lastUpdatedText}>
            {formatLastUpdated(lastUpdated)}
            <Text style={styles.metaDivider}>  ·  </Text>
          </Text>
          <TouchableOpacity
            style={[styles.refreshLink, isRefreshing && styles.refreshButtonDisabled]}
            activeOpacity={0.8}
            onPress={() => fetchFlaggedCounts()}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshText}>{isRefreshing ? 'Refreshing ↺' : 'Refresh ↺'}</Text>
          </TouchableOpacity>
        </View>
      </View>

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

              <View style={[styles.countBadge, hasPending ? card.styles.badge : styles.mutedBadge]}>
                <Text style={[styles.countBadgeText, hasPending ? card.styles.badgeText : styles.mutedBadgeText]}>
                  {card.count}
                </Text>
              </View>

              <FontAwesome name="chevron-right" size={18} color="#8E8E93" />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.separator} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <FontAwesome name="sign-out" size={20} color="black" style={styles.icon} />
        <Text style={styles.logoutText}>Log out</Text>
        <Text style={styles.arrow}> &gt;</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 28,
  },
  headerContainer: {
    marginBottom: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  header: {
    fontSize: 30,
    fontWeight: '800',
    color: '#101820',
    marginRight: 10,
  },
  adminPill: {
    borderRadius: 999,
    backgroundColor: '#FEF0C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FEDF89',
  },
  adminPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B54708',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#666A70',
  },
  metaDivider: {
    color: '#9CA3AF',
  },
  refreshLink: {
    paddingVertical: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666A70',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 14,
    color: '#101820',
    fontSize: 16,
    fontWeight: '700',
  },
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
  arrow: {
    fontSize: 16,
    color: 'black',
  },
  icon: {
    marginRight: 10,
  },
});

export default AdminScreen;
