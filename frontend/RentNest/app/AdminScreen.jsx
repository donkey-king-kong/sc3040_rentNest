import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import MorphingInfinity from '../components/MorphingInfinity';

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

  useEffect(() => {
    let isMounted = true;

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

    const fetchFlaggedCounts = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const [reviews, users, listings] = await Promise.all([
          fetchFlaggedCount('/api/reviews/admin/flagged', token),
          fetchFlaggedCount('/api/users/admin/flagged', token),
          fetchFlaggedCount('/api/listings/admin/flagged', token),
        ]);

        if (isMounted) {
          setCounts({ reviews, users, listings });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFlaggedCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalFlagged = counts.reviews + counts.users + counts.listings;

  const statCards = [
    {
      label: 'Total flagged',
      value: totalFlagged,
      tone: styles.totalStat,
      valueStyle: styles.totalStatValue,
      labelStyle: styles.totalStatLabel,
    },
    {
      label: 'Pending users',
      value: counts.users,
      tone: styles.userStat,
      valueStyle: styles.userStatValue,
    },
    {
      label: 'Pending listings',
      value: counts.listings,
      tone: styles.listingStat,
      valueStyle: styles.listingStatValue,
    },
  ];

  const navigationCards = [
    {
      title: 'Reviews',
      description: 'Review flagged feedback and remove harmful content.',
      count: counts.reviews,
      route: '/ProcessReviewsScreen',
      icon: 'flag',
      styles: {
        card: styles.reviewCard,
        iconWrap: styles.reviewIconWrap,
        icon: '#B42318',
        badge: styles.reviewBadge,
        badgeText: styles.reviewBadgeText,
      },
    },
    {
      title: 'Users',
      description: 'Investigate reported accounts and ban repeat offenders.',
      count: counts.users,
      route: '/BanUserScreen',
      icon: 'user-times',
      styles: {
        card: styles.userCard,
        iconWrap: styles.userIconWrap,
        icon: '#B54708',
        badge: styles.userBadge,
        badgeText: styles.userBadgeText,
      },
    },
    {
      title: 'Listings',
      description: 'Check flagged rental listings before they stay visible.',
      count: counts.listings,
      route: '/ReviewListingScreen',
      icon: 'home',
      styles: {
        card: styles.listingCard,
        iconWrap: styles.listingIconWrap,
        icon: '#175CD3',
        badge: styles.listingBadge,
        badgeText: styles.listingBadgeText,
      },
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Admin Management</Text>
        <Text style={styles.subheader}>Monitor flagged activity and jump into the right moderation queue.</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingCard}>
          <MorphingInfinity size={86} color="#2FA84F" />
          <Text style={styles.loadingText}>Loading flagged reports...</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            {statCards.map((stat) => (
              <View key={stat.label} style={[styles.statCard, stat.tone]}>
                <Text style={[styles.statValue, stat.valueStyle]}>{stat.value}</Text>
                <Text style={[styles.statLabel, stat.labelStyle]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardList}>
            {navigationCards.map((card) => (
              <TouchableOpacity
                key={card.title}
                style={[styles.navCard, card.styles.card]}
                activeOpacity={0.85}
                onPress={() => router.push(card.route)}
              >
                <View style={[styles.cardIconWrap, card.styles.iconWrap]}>
                  <FontAwesome name={card.icon} size={24} color={card.styles.icon} />
                </View>

                <View style={styles.cardCopy}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <View style={[styles.countBadge, card.styles.badge]}>
                      <Text style={[styles.countBadgeText, card.styles.badgeText]}>{card.count}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>

                <FontAwesome name="chevron-right" size={18} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
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
    paddingBottom: 36,
  },
  headerContainer: {
    marginBottom: 22,
  },
  header: {
    fontSize: 30,
    fontWeight: '800',
    color: '#101820',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666A70',
  },
  loadingCard: {
    minHeight: 240,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#666A70',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'center',
  },
  totalStat: {
    backgroundColor: '#101820',
  },
  userStat: {
    backgroundColor: '#FFF7E8',
  },
  listingStat: {
    backgroundColor: '#EAF2FF',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  totalStatValue: {
    color: '#FFFFFF',
  },
  userStatValue: {
    color: '#B54708',
  },
  listingStatValue: {
    color: '#175CD3',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#666A70',
    fontWeight: '700',
  },
  totalStatLabel: {
    color: '#D9DEE3',
  },
  cardList: {
    gap: 14,
  },
  navCard: {
    minHeight: 116,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  reviewCard: {
    borderColor: '#FEE4E2',
  },
  userCard: {
    borderColor: '#FEDF89',
  },
  listingCard: {
    borderColor: '#B2DDFF',
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
  cardCopy: {
    flex: 1,
    marginRight: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#101820',
    marginRight: 8,
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
});

export default AdminScreen;
