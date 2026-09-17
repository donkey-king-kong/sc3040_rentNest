import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Image } from 'react-native';
import axios from "axios";
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

import confirmationImage from '../assets/images/confirmation.png';
import errorImage from '../assets/images/error.png';

const LeaveReview = () => {
  const route = useRoute();
  const navigation = useNavigation();

  // Get tenantId, listingId, and ownerId from the route params
  const { ownerId, listingId, tenantId } = route.params;

  // Add debug logging for route params
  console.log('Route Params:', { ownerId, listingId, tenantId });

  const [token, setToken] = useState(null);  // New state for storing token
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Validate required parameters
    if (!ownerId || !tenantId) {
      setModalMessage("Missing required parameters. Please try again.");
      setIsError(true);
      setModalVisible(true);
      return;
    }

    // Fetch token on component mount
    const fetchToken = async () => {
      try {
        const retrievedToken = await AsyncStorage.getItem('token');
        if (retrievedToken) {
          setToken(retrievedToken);
          console.log('Token retrieved successfully');
        } else {
          console.log('No token found in AsyncStorage');
          setModalMessage("Authentication error. Please log in again.");
          setIsError(true);
          setModalVisible(true);
        }
      } catch (error) {
        console.error("Error retrieving token:", error);
        setModalMessage("Error retrieving authentication. Please log in again.");
        setIsError(true);
        setModalVisible(true);
      }
    };

    fetchToken();
  }, [ownerId, tenantId]);

  useEffect(() => {
    // Load review data once the token is available and we have required params
    if (token && ownerId && tenantId) {
      console.log('Fetching review with token and params:', { ownerId, tenantId });
      fetchReview();
    }
  }, [token, ownerId, tenantId]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      console.log(`Fetching review from: ${API_BASE_URL}/api/reviews/byOwnerAndTenant?userId=${ownerId}&reviewerId=${tenantId}`);

      const response = await axios.get(`${API_BASE_URL}/api/reviews/byOwnerAndTenant?userId=${ownerId}&reviewerId=${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Review API Response:', response.data);

      if (response.status === 200 && response.data) {
        // Found a review
        const userReview = response.data;
        setRating(userReview.rating);
        setReviewTitle(userReview.title);
        setReviewText(userReview.text);
        setIsEditing(true);
        setReviewId(userReview.reviewid);
      } else {
        console.log('No existing review found for this user-owner pair.');
        setIsEditing(false);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // No review found
        console.log('No review found for this user-owner pair. Navigating to create mode.');
        setIsEditing(false);
      } else {
        let errorMessage = "Error fetching review.";
        if (error.response) {
          console.error('Error response:', error.response);
          errorMessage = `Error: ${error.response.data.message || errorMessage}`;
        } else if (error.request) {
          console.error('Error request:', error.request);
          errorMessage = "No response from server.";
        } else {
          console.error('Error message:', error.message);
        }
        setModalMessage(errorMessage);
        setIsError(true);
        setModalVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!ownerId || !tenantId) {
      setModalMessage("Missing required parameters. Please try again.");
      setIsError(true);
      setModalVisible(true);
      return;
    }

    if (rating === 0 || !reviewTitle.trim() || !reviewText.trim()) {
      setModalMessage("Please fill in all fields before submitting.");
      setIsError(true);
      setModalVisible(true);
      return;
    }

    try {
      const reviewData = {
        userID: ownerId,
        rating,
        title: reviewTitle,
        text: reviewText,
        reviewerID: parseInt(tenantId, 10),
        flagged: false
      };

      console.log('Submitting review with data:', reviewData);

      let response;

      // In handleSubmit function, for updating the review:
      if (isEditing) {
        console.log('Attempting to update review with data:', reviewData); // Added log
        response = await axios.put(`${API_BASE_URL}/api/reviews/${reviewId}`, reviewData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('Review updated successfully:', response.status, response.data); // Added log
      } else {
        console.log('Attempting to create new review with data:', reviewData); // Added log
        response = await axios.post(`${API_BASE_URL}/api/reviews`, reviewData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('Review created successfully:', response.status, response.data); // Added log
      }

      if (response.status === 200 || response.status === 201) {
        setModalMessage(isEditing ? "Review Updated Successfully!" : "Review Submitted Successfully!");
        setIsError(false);
        setModalVisible(true);
        setRating(0);
        setReviewTitle('');
        setReviewText('');
      }
    } catch (error) {
      let errorMessage = "An error occurred. Please try again.";
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Review not found. Please try again.";
        } else if (error.response.status === 400) {
          errorMessage = "Invalid data. Please check your input.";
        } else {
          errorMessage = `Error: ${error.response.data.message || errorMessage}`;
        }
      } else if (error.request) {
        console.error('Error request:', error.request);
        errorMessage = "No response from server.";
      } else {
        console.error('Error message:', error.message);
      }
      setModalMessage(errorMessage);
      setIsError(true);
      setModalVisible(true);
    }
  };

  const handleDelete = async () => {
    if (!reviewId) {
      setModalMessage("Cannot delete review: Review ID is missing.");
      setIsError(true);
      setModalVisible(true);
      return;
    }

    try {
      console.log('Attempting to delete review with ID:', reviewId); // Added log
      const response = await axios.delete(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      setModalMessage("Review Deleted!");
      console.log(`Response Status: ${response.status}. Review Deleted successfully!`); // Added log
      setIsError(false);
      setModalVisible(true);
    } catch (error) {
      console.error('Error deleting review:', error);
      setModalMessage("Failed to delete the review. Please try again.");
      setIsError(true);
      setModalVisible(true);
    }
  };

  const handleStarPress = (star) => {
    setRating(star);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.header}>{isEditing ? "Edit Review" : "Leave Review"}</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleStarPress(star)}>
                  <Text style={star <= rating ? styles.selectedStar : styles.star}>★</Text>
                </TouchableOpacity>
            ))}
          </View>

          <TextInput
              style={styles.input}
              placeholder="Review Title"
              value={reviewTitle}
              onChangeText={setReviewTitle}
          />

          <TextInput
              style={styles.textArea}
              placeholder="Write your review here..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
          />
        </ScrollView>

        {isEditing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Review</Text>
            </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{isEditing ? "Update Review" : "Submit Review"}</Text>
        </TouchableOpacity>

        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image
                  source={isError ? errorImage : confirmationImage}
                  style={styles.confirmationImage}
                  resizeMode="contain"
              />
              <Text style={styles.modalText}>{modalMessage}</Text>

              <TouchableOpacity
                  style={styles.returnButton}
                  onPress={() => {
                    setModalVisible(false);
                    if (isError && modalMessage.includes("Authentication error")) {
                      navigation.replace('LoginScreen');
                    } else {
                      // Use the correct parameters
                      navigation.navigate('RentalInfoTenantScreen', {
                        listingId: listingId,
                        tenantId: tenantId,
                        ownerId: ownerId
                      });
                    }
                  }}
              >
                <Text style={styles.returnButtonText}>Return</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 80,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  star: {
    fontSize: 40,
    color: '#ccc',
  },
  selectedStar: {
    fontSize: 40,
    color: '#FFD700',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#222222',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderColor: '#222222',
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 50,
  },
  deleteButtonText: {
    color: '#222222',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  confirmationImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  returnButton: {
    backgroundColor: '#222222',
    padding: 10,
    borderRadius: 5,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default LeaveReview;
