import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Image, KeyboardAvoidingView, Platform } from 'react-native';
import axios from "axios";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MorphingInfinity from '../components/MorphingInfinity';

import confirmationImage from '../assets/images/confirmation.png';
import errorImage from '../assets/images/error.png';

const LeaveReview = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ownerId, listingId, tenantId, revieweeName, ownerName, tenantName, revieweeRole, role, revieweePhotoURL } = useLocalSearchParams();

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
  const [revieweeProfile, setRevieweeProfile] = useState(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

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
      fetchRevieweeProfile();
    }
  }, [token, ownerId, tenantId]);

  const fetchRevieweeProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/id/${ownerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      setRevieweeProfile(response.data);
    } catch (error) {
      console.error('Error fetching reviewee profile:', error);
    }
  };

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

  const getParamValue = (value) => {
    const paramValue = Array.isArray(value) ? value[0] : value;
    return paramValue && paramValue !== 'undefined' ? paramValue : undefined;
  };
  const displayedRevieweeName = getParamValue(revieweeName) || getParamValue(ownerName) || getParamValue(tenantName) || `User ${getParamValue(ownerId) || ''}`.trim();
  const displayedRevieweeRole = getParamValue(revieweeRole) || getParamValue(role) || 'User';
  const displayedRevieweePhotoURL = getParamValue(revieweePhotoURL)
      || revieweeProfile?.photoURL
      || revieweeProfile?.profilePhotoURL
      || revieweeProfile?.profilePicture
      || revieweeProfile?.avatar;
  const canShowRevieweePhoto = displayedRevieweePhotoURL && !avatarLoadFailed;
  const isSubmitDisabled = rating === 0 || !reviewTitle.trim() || !reviewText.trim();
  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent',
  };

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [displayedRevieweePhotoURL]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Preparing review...</Text>
      </View>
    );
  }

  return (
      <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={18} color="#101820" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Leave a review</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
          <View style={styles.revieweeCard}>
            <View style={styles.avatarCircle}>
              {canShowRevieweePhoto ? (
                  <Image
                      source={{ uri: displayedRevieweePhotoURL }}
                      style={styles.avatarImage}
                      onError={() => setAvatarLoadFailed(true)}
                  />
              ) : (
                  <Text style={styles.avatarInitial}>{displayedRevieweeName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.revieweeMeta}>
              <Text style={styles.revieweeName}>{displayedRevieweeName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{displayedRevieweeRole}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>YOUR RATING</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => handleStarPress(star)} hitSlop={8}>
                    <Text style={star <= rating ? styles.selectedStar : styles.star}>★</Text>
                  </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingHint}>{rating ? ratingLabels[rating] : 'Tap to rate'}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput
                style={styles.input}
                placeholder="Summarise your experience"
                placeholderTextColor="#AEAEB2"
                value={reviewTitle}
                onChangeText={setReviewTitle}
            />
          </View>

          <View style={styles.reviewInputGroup}>
            <Text style={styles.fieldLabel}>REVIEW</Text>
            <TextInput
                style={styles.textArea}
                placeholder="Write your review here..."
                placeholderTextColor="#AEAEB2"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                maxLength={500}
            />
            <Text style={styles.characterCount}>{reviewText.length} / 500</Text>
          </View>

          {isEditing && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete review</Text>
              </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          <TouchableOpacity
              style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              activeOpacity={isSubmitDisabled ? 1 : 0.75}
          >
            <FontAwesome name="check" size={13} color={isSubmitDisabled ? "#8E8E93" : "#FFFFFF"} style={styles.submitIcon} />
            <Text style={[styles.submitButtonText, isSubmitDisabled && styles.submitButtonTextDisabled]}>Submit review</Text>
          </TouchableOpacity>
        </View>

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
                      router.replace('/LoginScreen');
                    } else {
                      router.push({ pathname: '/RentalInfoTenantScreen', params: { listingId, tenantId, ownerId } });
                    }
                  }}
              >
                <Text style={styles.returnButtonText}>Return</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#2FA84F',
  },
  scrollContainer: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  navHeader: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F2',
  },
  backButton: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  headerSpacer: {
    minWidth: 40,
  },
  content: {
    flexGrow: 1,
  },
  revieweeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 18,
    marginBottom: 20,
    paddingTop: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F2',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  revieweeMeta: {
    flex: 1,
  },
  revieweeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#636366',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 10,
    marginTop: 16,
  },
  star: {
    fontSize: 40,
    color: '#E5E5EA',
  },
  selectedStar: {
    fontSize: 40,
    color: '#FF9F0A',
  },
  section: {
    marginBottom: 22,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#AEAEB2',
  },
  ratingHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  reviewInputGroup: {
    marginBottom: 24,
  },
  input: {
    marginTop: 8,
    backgroundColor: '#F9F9F9',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontSize: 13,
    color: '#3C3C3E',
  },
  textArea: {
    marginTop: 8,
    height: 100,
    backgroundColor: '#F9F9F9',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontSize: 13,
    color: '#3C3C3E',
    textAlignVertical: 'top',
  },
  characterCount: {
    marginTop: 6,
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'right',
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 18,
    borderTopWidth: 0.5,
    borderTopColor: '#f2f2f2',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  submitIcon: {
    marginRight: 7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#8E8E93',
  },
  deleteButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
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
