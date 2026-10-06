import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import axios from "axios";
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MorphingInfinity from '../components/MorphingInfinity';
import { jwtDecode } from 'jwt-decode';

import errorImage from '../assets/images/error.png';
const notificationBellIcon = require('../assets/images/notificationBell.png');

const normalizeId = (value) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getReviewId = (review) => review?.reviewID || review?.reviewId || review?.reviewid || review?.id;

const LeaveReview = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    revieweeId,
    reviewerId: routeReviewerId,
    ownerId,
    listingId,
    tenantId,
    revieweeName,
    ownerName,
    tenantName,
    revieweeRole,
    role,
    revieweePhotoURL
  } = useLocalSearchParams();
  const reviewedUserId = normalizeId(revieweeId) || normalizeId(ownerId);
  const fallbackReviewerId = normalizeId(routeReviewerId) || normalizeId(tenantId);

  // Add debug logging for route params
  console.log('Route Params:', { revieweeId, routeReviewerId, ownerId, listingId, tenantId });

  const [token, setToken] = useState(null);  // New state for storing token
  const [reviewerId, setReviewerId] = useState(fallbackReviewerId);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialReview, setInitialReview] = useState(null);
  const [reviewTextSelection, setReviewTextSelection] = useState(undefined);
  const notificationTimeoutRef = useRef(null);

  useEffect(() => {
    // Validate required parameters
    if (!reviewedUserId) {
      setModalMessage("Missing required parameters. Please try again.");
      setIsError(true);
      setModalVisible(true);
      setLoading(false);
      return;
    }

    // Fetch token on component mount
    const fetchToken = async () => {
      try {
        const retrievedToken = await AsyncStorage.getItem('token');
        if (retrievedToken) {
          setToken(retrievedToken);
          console.log('Token retrieved successfully');

          try {
            const decoded = jwtDecode(retrievedToken);
            const response = await axios.get(`${API_BASE_URL}/api/users/${decoded.sub}`, {
              headers: {
                'Authorization': `Bearer ${retrievedToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });

            const authenticatedReviewerId = normalizeId(response.data?.userID || response.data?.userId);
            if (authenticatedReviewerId) {
              setReviewerId(authenticatedReviewerId);
              await AsyncStorage.setItem('userId', authenticatedReviewerId.toString());
            }
          } catch (profileError) {
            console.error("Error resolving authenticated reviewer:", profileError);
            if (!fallbackReviewerId) {
              setModalMessage("Could not identify the logged-in reviewer. Please try again.");
              setIsError(true);
              setModalVisible(true);
              setLoading(false);
            }
          }
        } else {
          console.log('No token found in AsyncStorage');
          setModalMessage("Authentication error. Please log in again.");
          setIsError(true);
          setModalVisible(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error retrieving token:", error);
        setModalMessage("Error retrieving authentication. Please log in again.");
        setIsError(true);
        setModalVisible(true);
        setLoading(false);
      }
    };

    fetchToken();
  }, [reviewedUserId, fallbackReviewerId]);

  useEffect(() => {
    // Load review data once the token is available and we have required params
    if (token && reviewedUserId && reviewerId) {
      console.log('Fetching review with token and params:', { reviewedUserId, reviewerId });
      fetchReview();
      fetchRevieweeProfile();
    }
  }, [token, reviewedUserId, reviewerId]);

  const fetchRevieweeProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/id/${reviewedUserId}`, {
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
      console.log(`Fetching review from: ${API_BASE_URL}/api/reviews/byOwnerAndTenant?userId=${reviewedUserId}&reviewerId=${reviewerId}`);

      const response = await axios.get(`${API_BASE_URL}/api/reviews/byOwnerAndTenant?userId=${reviewedUserId}&reviewerId=${reviewerId}`, {
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
        const fetchedReviewId = getReviewId(userReview);
        setRating(userReview.rating);
        setReviewTitle(userReview.title || '');
        setReviewText(userReview.text || '');
        setReviewTextSelection({ start: 0, end: 0 });
        setIsEditing(Boolean(fetchedReviewId));
        setReviewId(fetchedReviewId || null);
        setInitialReview({
          rating: userReview.rating,
          title: userReview.title || '',
          text: userReview.text || '',
        });
      } else {
        console.log('No existing review found for this user-owner pair.');
        setIsEditing(false);
        setInitialReview(null);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // No review found
        console.log('No review found for this user-owner pair. Navigating to create mode.');
        setIsEditing(false);
        setInitialReview(null);
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
    if (isSubmitting) {
      return;
    }

    if (!reviewedUserId || !reviewerId) {
      setModalMessage("Missing required review user information. Please try again.");
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
      setIsSubmitting(true);
      const reviewData = {
        userID: reviewedUserId,
        rating,
        title: reviewTitle.trim(),
        text: reviewText.trim(),
        flagged: false
      };

      console.log('Submitting review with data:', reviewData);

      let response;

      // In handleSubmit function, for updating the review:
      if (isEditing && reviewId) {
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
        let persistedReviewId = getReviewId(response.data);

        if (!persistedReviewId) {
          const verificationResponse = await axios.get(`${API_BASE_URL}/api/reviews/byOwnerAndTenant?userId=${reviewedUserId}&reviewerId=${reviewerId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          persistedReviewId = getReviewId(verificationResponse.data);
        }

        if (!persistedReviewId) {
          throw new Error("Review submit returned success, but the saved review could not be verified.");
        }

        setReviewId(persistedReviewId);
        setModalMessage(isEditing ? "Review Updated" : "Review Submitted");
        setIsError(false);
        setModalVisible(true);
      }
    } catch (error) {
      let errorMessage = "An error occurred. Please try again.";
      if (error.response) {
        const responseMessage = typeof error.response.data === 'string'
            ? error.response.data
            : error.response.data?.message;

        if (error.response.status === 404) {
          errorMessage = isEditing ? "Review not found. Please try again." : "Review was not saved. Please try again.";
        } else if (error.response.status === 400) {
          errorMessage = responseMessage || "Invalid data. Please check your input.";
        } else {
          errorMessage = responseMessage || errorMessage;
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
    } finally {
      setIsSubmitting(false);
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
      setModalMessage("Review Deleted");
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
  const displayedRevieweeName = getParamValue(revieweeName) || getParamValue(ownerName) || getParamValue(tenantName) || `User ${reviewedUserId || ''}`.trim();
  const displayedRevieweeRole = getParamValue(revieweeRole) || getParamValue(role) || 'User';
  const displayedRevieweePhotoURL = getParamValue(revieweePhotoURL)
      || revieweeProfile?.photoURL
      || revieweeProfile?.profilePhotoURL
      || revieweeProfile?.profilePicture
      || revieweeProfile?.avatar;
  const canShowRevieweePhoto = displayedRevieweePhotoURL && !avatarLoadFailed;
  const hasRequiredFields = rating > 0 && Boolean(reviewTitle.trim()) && Boolean(reviewText.trim());
  const hasReviewChanged = !isEditing || !initialReview
      || rating !== initialReview.rating
      || reviewTitle.trim() !== initialReview.title.trim()
      || reviewText.trim() !== initialReview.text.trim();
  const isFormSubmitDisabled = !hasRequiredFields || !hasReviewChanged;
  const isSubmitDisabled = isSubmitting || isFormSubmitDisabled;
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

  useEffect(() => {
    if (!reviewTextSelection) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setReviewTextSelection(undefined);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [reviewTextSelection]);

  useEffect(() => {
    if (!modalVisible || isError) {
      return undefined;
    }

    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = setTimeout(() => {
      setModalVisible(false);
      router.back();
    }, 2000);

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [modalVisible, isError, router, reviewedUserId, reviewerId, displayedRevieweeName, displayedRevieweeRole, displayedRevieweePhotoURL]);

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
                selection={reviewTextSelection}
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
              style={[
                styles.submitButton,
                isFormSubmitDisabled && !isSubmitting && styles.submitButtonDisabled,
                isSubmitting && styles.submitButtonSubmitting,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              activeOpacity={isSubmitDisabled ? 1 : 0.75}
          >
            {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.submitLoadingIcon} />
            ) : (
                <FontAwesome name="check" size={13} color={isFormSubmitDisabled ? "#8E8E93" : "#FFFFFF"} style={styles.submitIcon} />
            )}
            <Text style={[styles.submitButtonText, isFormSubmitDisabled && !isSubmitting && styles.submitButtonTextDisabled]}>
              {isSubmitting ? (isEditing ? 'Updating review...' : 'Submitting review...') : 'Submit review'}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
            animationType={isError ? "slide" : "fade"}
            transparent={true}
            visible={modalVisible}
            statusBarTranslucent={!isError}
            onRequestClose={() => setModalVisible(false)}
        >
          {isError ? (
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Image
                      source={errorImage}
                      style={styles.confirmationImage}
                      resizeMode="contain"
                  />
                  <Text style={styles.modalText}>{modalMessage}</Text>

                  <TouchableOpacity
                      style={styles.returnButton}
                      onPress={() => {
                        setModalVisible(false);
                        if (modalMessage.includes("Authentication error")) {
                          router.replace('/LoginScreen');
                        } else {
                          router.back();
                        }
                      }}
                  >
                    <Text style={styles.returnButtonText}>Return</Text>
                  </TouchableOpacity>
                </View>
              </View>
          ) : (
              <View style={styles.notificationOverlay} pointerEvents="none">
                <View style={styles.notificationCard}>
                  <View style={styles.notificationIconBox}>
                    <Image source={notificationBellIcon} style={styles.notificationIcon} />
                  </View>
                  <Text style={styles.notificationText}>{modalMessage}</Text>
                </View>
              </View>
          )}
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
  submitButtonSubmitting: {
    backgroundColor: '#007AFF',
    opacity: 1,
  },
  submitIcon: {
    marginRight: 7,
  },
  submitLoadingIcon: {
    marginRight: 8,
    transform: [{ scale: 1.15 }],
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
  notificationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  notificationCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.82)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  notificationIconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 58, 58, 0.72)',
    marginBottom: 16,
  },
  notificationIcon: {
    width: 34,
    height: 40,
    resizeMode: 'contain',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
});

export default LeaveReview;
