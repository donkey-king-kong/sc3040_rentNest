import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const ProcessReviewsScreen = () => {
  const [reviewsData, setReviewsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { refresh } = useLocalSearchParams();

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

  if (!reviewsData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Process Flagged Reviews</Text>

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
              onPress={() => router.push(`/ProcessReviewsScreen2?reviewid=${item.reviewid}`)} // Navigate to ProcessReviews2
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
    marginBottom: 20,
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
