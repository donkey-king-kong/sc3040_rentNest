import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import MorphingInfinity from '../components/MorphingInfinity';

const ProcessReviewsScreen = () => {
  const [reviewsData, setReviewsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const navigateTimeoutRef = useRef(null);
  const resetTimeoutRef = useRef(null);

  const getFlaggedReviews = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/reviews/admin/flagged`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      
      console.log("Flagged Reviews Response:", response.data);

      const flaggedReviews = response.data.map(review => ({
          reviewid: review.reviewID,
          rating: review.rating,
          title: review.title,
          text: review.text,
          user: { userID: review.reviewerID,
                  name: review.reviewerName,
                  email: review.reviewerEmail,
                  photoURL: review.reviewerPhotoURL,
                },
          flagged: review.flagged,
      }))
      console.log(flaggedReviews);
      setReviewsData(flaggedReviews);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await getFlaggedReviews();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    getFlaggedReviews();

    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [refresh]);

  // Search function to filter reviews by title or text
  const filterReviews = (reviews, query) => {
    if (!query || !reviews) return reviews;
    return reviews.filter(review =>
      review.title.toLowerCase().includes(query.toLowerCase()) ||
      review.text.toLowerCase().includes(query.toLowerCase()) ||
      review.user.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const navigateWithLoading = (route, replace = false) => {
    setIsRouteLoading(true);
    navigateTimeoutRef.current = setTimeout(() => {
      if (replace) {
        router.replace(route);
      } else {
        router.push(route);
      }
      resetTimeoutRef.current = setTimeout(() => setIsRouteLoading(false), 600);
    }, 180);
  };

  if (!reviewsData || isRouteLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>
          {isRouteLoading ? 'Loading review details...' : 'Loading flagged reviews...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateWithLoading('/AdminScreen', true)}>
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </TouchableOpacity>
        <Text style={styles.header}>Process Flagged Reviews</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by review title or user..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* FlatList for reviews */}
      <FlatList
        data={filterReviews(reviewsData, searchQuery)}
        keyExtractor={item => item.reviewid.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.reviewBox}>
            {/* Star Rating */}
            <View style={styles.ratingContainer}>
              {Array.from({ length: 5 }, (_, i) => (
                <FontAwesome
                  key={i}
                  name={i < item.rating ? 'star' : 'star-o'}
                  size={20}
                  color="#222222"
                />
              ))}
            </View>

            {/* Review Title */}
            <Text style={styles.reviewTitle}>{item.title}</Text>

            {/* User Name */}
            <Text style={styles.userName}>{item.user.name}</Text>

            {/* Flag Icon */}
            <Image source={require('../assets/images/flag.png')} style={styles.flagIcon} />

            {/* Review Button */}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => navigateWithLoading(`/ProcessReviewsScreen2?reviewid=${item.reviewid}`)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerSpacer: {
    width: 42,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: '#000', // Add text color
  },
  reviewBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  reviewContent: {
    fontSize: 16,
    marginBottom: 10,
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  flagContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  flagIcon: {
    width: 25,
    height: 25,
    position: 'absolute',
    top: 10,
    right: 10,
  },
  reviewButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 10,
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProcessReviewsScreen;
