import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ProcessReviews2 = () => {
  const router = useRouter();
  const route = useRoute();
  const { reviewid } = route.params || {};
  const [review, setReview] = useState(null);

  useEffect(() => {
    getFlaggedReview();
  }, [reviewid]);

  const getFlaggedReview = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing GET ${API_BASE_URL}/api/reviews/${reviewid}`)
      const response = await axios.get(`${API_BASE_URL}/api/reviews/${reviewid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log("Response :", response.data)

      // Transform single user data
      const transformedData = {
        reviewid: response.data.reviewID,
        rating: response.data.rating,
        title: response.data.title,
        text: response.data.text,
        user: { 
          userID: response.data.reviewerID,
          name: response.data.reviewerName,
          email: response.data.reviewerEmail,
          photoURL: response.data.reviewerPhotoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg",
        },
        flagged: response.data.flagged,
      };
      console.log(transformedData);

      setReview(transformedData);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const handleIgnoreReview = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing PUT ${API_BASE_URL}/api/reviews/setFlag/${reviewid}/false`);
      await axios.put(`${API_BASE_URL}/api/reviews/setFlag/${reviewid}/false`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Go back and trigger refresh
      router.setParams({ refresh: 'true' });
      router.back();
    } catch (error) {
      console.error("Failed to ignore review:", error);
    }
  };

  const handleDeleteReview = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      console.log(`Executing DELETE ${API_BASE_URL}/api/reviews/${reviewid}`);
      await axios.delete(`${API_BASE_URL}/api/reviews/${reviewid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      // Navigate to process reviews screen 3
      router.push('/ProcessReviewsScreen3');
    } catch (error) {
      console.error("Failed to delete review:", error);
    }
  };

  if (!review) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.reviewBox}>
        <View style={styles.header}>
          <View style={styles.starsContainer}>
            {Array.from({ length: 5 }, (_, index) => (
              <Ionicons
                key={index}
                name={index < review.rating ? "star" : "star-outline"} // Filled or outlined star based on rating
                size={20}
                color={index < review.rating ? "#222" : "#222"} // Color for stars
                style={styles.starIcon}
              />
            ))}
          </View>
          <Image source={require('../assets/images/flag.png')} style={styles.flagIcon} />
        </View>

        <Text style={styles.title}>{review.title}</Text>
        <Text style={styles.text}>{review.text}</Text>
        <View style={styles.userContainer}>
          {/* User Image and Name */}
          <Image source={{ uri: review.user.photoURL }} style={styles.userImage} />
          <Text style={styles.userName}>{review.user.name}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.ignoreButton]}
          onPress={handleIgnoreReview}
        >
          <Text style={styles.buttonText}>Ignore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteReview}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  reviewBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  flagIcon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    marginBottom: 10,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '40%', // Adjust width as necessary
  },
  ignoreButton: {
    backgroundColor: 'green',
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ProcessReviews2;
