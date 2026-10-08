import React, { useEffect, useState } from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ActivityIndicator} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_BASE_URL} from "../config/api";
import MorphingInfinity from '../components/MorphingInfinity';
import { FontAwesome } from '@expo/vector-icons';
import ProfileImage from '../components/ProfileImage';

const UserReviewsScreen = () => {
    const router = useRouter();
    const { userId, currentUser, revieweeName, revieweeRole, revieweePhotoURL } = useLocalSearchParams();

    // Placeholder user data
    // const getRandomAvatar = () => {
    //     const randomNum = Math.floor(Math.random() * 10) + 1; // Random number between 1 and 10
    //     return `https://randomuser.me/api/portraits/lego/${randomNum}.jpg`;
    // };

    // State to hold the reviews, loading state, and error state
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [storedCurrentUserId, setStoredCurrentUserId] = useState(null);
    const [ownReviewId, setOwnReviewId] = useState(null);
    const [reviewPendingFlag, setReviewPendingFlag] = useState(null);
    const [flaggingReviewId, setFlaggingReviewId] = useState(null);
    const [showFlagSuccess, setShowFlagSuccess] = useState(false);
    const currentUserId = (Array.isArray(currentUser) ? currentUser[0] : currentUser) || storedCurrentUserId;

    useEffect(() => {
        const loadCurrentUserId = async () => {
            const userIdFromStorage = await AsyncStorage.getItem('userId');
            setStoredCurrentUserId(userIdFromStorage);
        };

        loadCurrentUserId();
    }, []);

    useEffect(() => {
        const fetchUserReviews = async () => {
            try {
                setLoading(true); // Start loading

                // Check if `userId` is valid
                if (!userId) {
                    throw new Error("User ID is missing. Please provide a valid user ID.");
                }

                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    throw new Error("No authentication token found. Please login.");
                }

                let currentUserReviewId = null;
                if (currentUserId) {
                    try {
                        const ownReviewResponse = await fetch(`${API_BASE_URL}/api/reviews/byOwnerAndTenant?userId=${userId}&reviewerId=${currentUserId}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                            },
                        });

                        if (ownReviewResponse.ok) {
                            const ownReview = await ownReviewResponse.json();
                            currentUserReviewId = ownReview.reviewid || ownReview.reviewID || ownReview.id;
                        }
                    } catch (ownReviewError) {
                        console.error("Error checking current user's review:", ownReviewError);
                    }
                }
                setOwnReviewId(currentUserReviewId);

                // Make an API call to fetch the reviews of the user
                const response = await fetch(`${API_BASE_URL}/api/reviews/byUser/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const rawBody = await response.text();
                    const hasJsonBody = response.headers.get('content-type')?.includes('application/json');
                    const hasNoReviewsMessage = rawBody.trim().toLowerCase().startsWith('no reviews');

                    if (response.status === 204 || rawBody.trim() === '' || hasNoReviewsMessage) {
                        setReviews([]);
                        setError(null);
                        return;
                    }

                    if (!hasJsonBody) {
                        throw new Error(rawBody || 'Unexpected response while fetching user reviews.');
                    }

                    const data = JSON.parse(rawBody);
                    const reviewList = Array.isArray(data) ? data : [];
                    const avatars = [
                        'https://randomuser.me/api/portraits/lego/1.jpg',
                        'https://randomuser.me/api/portraits/lego/2.jpg',
                        'https://randomuser.me/api/portraits/lego/3.jpg',
                        'https://randomuser.me/api/portraits/lego/4.jpg',
                        'https://randomuser.me/api/portraits/lego/5.jpg',
                    ];

                    // Use different avatar URLs based on review ID
                    setReviews(reviewList.map((review, index) => {
                        // Try to parse the date, fall back if it's invalid
                        // let formattedDate;
                        // try {
                        //     const date = new Date(review.date);
                        //     formattedDate = !isNaN(date.getTime()) ? date.toLocaleDateString() : "Date not available";
                        // } catch {
                        //     formattedDate = "Date not available";
                        // }

                        return {
                            id: review.reviewID || review.reviewid || review.id,
                            userId: review.userID || review.userId,
                            reviewerId: review.reviewerID || review.reviewerId,
                            reviewer: review.reviewerName,
                            // date: formattedDate, // Formatting the date to be more readable
                            avatar: review.reviewerPhotoURL || review.photoURL || review.avatar || avatars[index % avatars.length],
                            rating: review.rating,
                            title: review.title,
                            content: review.text,
                            flagged: review.flagged,
                        };
                    }));
                    setError(null);

                } else if (response.status === 204) {
                    // Handle case where there are no reviews for the user
                    setReviews([]);
                    setError(null);
                } else {
                    const errorBody = await response.text();
                    throw new Error(errorBody || "Error fetching user reviews. Status code: " + response.status);
                }
            } catch (error) {
                console.error("Error fetching user reviews:", error);
                setError(error.message);
            } finally {
                setLoading(false); // Stop loading after the request completes
            }
        };

        fetchUserReviews();
    }, [userId, currentUserId]);

// Function to handle flagging/unflagging a review with user confirmation
    const handleFlagReview = (reviewId, currentlyFlagged) => {
        const nextFlagValue = !currentlyFlagged;

        setReviewPendingFlag({
            reviewId,
            currentlyFlagged,
            nextFlagValue,
        });
    };

    const closeFlagConfirm = () => {
        if (flaggingReviewId) {
            return;
        }

        setReviewPendingFlag(null);
    };

    const confirmFlagReview = async () => {
        if (!reviewPendingFlag || flaggingReviewId) {
            return;
        }

        const { reviewId, currentlyFlagged, nextFlagValue } = reviewPendingFlag;
        setFlaggingReviewId(reviewId);

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error("No authentication token found. Please login.");
            }

            const flagUrl = `${API_BASE_URL}/api/reviews/setFlag/${reviewId}/${nextFlagValue}`;
            console.log("[UserReviewsScreen] flag review request", {
                reviewId,
                currentlyFlagged,
                nextFlagValue,
                url: flagUrl,
            });

            const response = await fetch(flagUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            const rawBody = await response.text();
            let responseBody = rawBody;
            try {
                responseBody = rawBody ? JSON.parse(rawBody) : null;
            } catch {
                // Keep the raw response text for logging if the backend returns non-JSON.
            }

            console.log("[UserReviewsScreen] flag review response", {
                reviewId,
                requestedFlagValue: nextFlagValue,
                status: response.status,
                ok: response.ok,
                responseBody,
            });

            if (!response.ok) {
                throw new Error(rawBody || `Failed to update review flag. Status code: ${response.status}`);
            }

            const persistedFlagValue = responseBody?.flagged ?? nextFlagValue;

            setReviews((prevReviews) =>
                prevReviews.map((review) =>
                    review.id === reviewId ? { ...review, flagged: persistedFlagValue } : review
                )
            );
            setReviewPendingFlag(null);
            setShowFlagSuccess(true);
            setTimeout(() => setShowFlagSuccess(false), 1500);
        } catch (error) {
            console.error("[UserReviewsScreen] flag review failed", {
                reviewId,
                currentlyFlagged,
                nextFlagValue,
                error: error.message,
            });
            Alert.alert("Error", error.message || "Unable to update review flag. Please try again.");
        } finally {
            setFlaggingReviewId(null);
        }
    };

    const handleEditReview = (review) => {
        router.push({
            pathname: '/LeaveReview',
            params: {
                revieweeId: review.userId || userId,
                revieweeName,
                revieweeRole,
                revieweePhotoURL,
            },
        });
    };

    const renderReview = ({ item }) => {
        const isOwnReview = String(item.reviewerId) === String(currentUserId)
            || (ownReviewId && String(item.id) === String(ownReviewId));

        return (
            <View style={styles.reviewCard}>
                <View style={styles.reviewerInfo}>
                    <ProfileImage
                        uri={item.avatar}
                        name={item.reviewer}
                        style={styles.reviewerAvatar}
                        textStyle={styles.reviewerAvatarInitials}
                        screen="UserReviewsScreen"
                        userId={item.reviewerId}
                        role="reviewer"
                    />
                    <View>
                        <Text style={styles.reviewerName}>{item.reviewer}</Text>
                    </View>
                </View>
                <View style={styles.reviewContent}>
                    <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Text key={star} style={item.rating >= star ? styles.selectedStar : styles.star}>
                                ★
                            </Text>
                        ))}
                    </View>
                    <Text style={styles.reviewTitle}>{item.title}</Text>
                    <Text style={styles.reviewText}>{item.content}</Text>
                </View>
                <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => isOwnReview ? handleEditReview(item) : handleFlagReview(item.id, item.flagged)}
                    disabled={(!isOwnReview && item.flagged) || flaggingReviewId === item.id}
                >
                    {flaggingReviewId === item.id ? (
                        <ActivityIndicator size="small" color="#8E8E93" />
                    ) : (
                        <FontAwesome
                            name={isOwnReview ? "pencil" : "flag"}
                            size={16}
                            color={!isOwnReview && item.flagged ? "#FF3B30" : "#8E8E93"}
                        />
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const handleLeaveFirstReview = () => {
        router.push({
            pathname: '/LeaveReview',
            params: {
                revieweeId: userId,
                revieweeName,
                revieweeRole,
                revieweePhotoURL,
            },
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color="#101820" />
                </TouchableOpacity>
                <Text style={styles.header}>Reviews</Text>
            </View>
            {loading ? (
                <View style={styles.loadingContent}>
                    <MorphingInfinity size={86} color="#2FA84F" />
                    <Text style={styles.loadingText}>Loading reviews...</Text>
                </View>
            ) : error ? (
                <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
            ) : reviews.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <FontAwesome name="star-o" size={36} color="#C7C7CC" />
                    </View>
                    <Text style={styles.emptyTitle}>No reviews yet</Text>
                    <Text style={styles.emptySubtitle}>
                        This user hasn't received any reviews yet.
                    </Text>
                    <TouchableOpacity style={styles.emptyActionButton} onPress={handleLeaveFirstReview}>
                        <FontAwesome name="star-o" size={14} color="#8E8E93" />
                        <Text style={styles.emptyActionText}>Leave the first review</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    renderItem={renderReview}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}
            <Modal
                visible={!!reviewPendingFlag}
                transparent
                animationType="fade"
                onRequestClose={closeFlagConfirm}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmModalCard}>
                        <Text style={styles.confirmTitle}>
                            {reviewPendingFlag?.currentlyFlagged ? "Unflag Review" : "Flag Review"}
                        </Text>
                        <Text style={styles.confirmMessage}>
                            Are you sure you want to {reviewPendingFlag?.currentlyFlagged ? "unflag" : "flag"} this review?
                        </Text>
                        <Text style={styles.confirmWarning}>This cannot be undone.</Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.confirmCancelButton}
                                onPress={closeFlagConfirm}
                                disabled={!!flaggingReviewId}
                            >
                                <Text style={styles.confirmCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmYesButton, flaggingReviewId && styles.confirmDisabledButton]}
                                onPress={confirmFlagReview}
                                disabled={!!flaggingReviewId}
                            >
                                {flaggingReviewId ? (
                                    <View style={styles.flaggingContent}>
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                        <Text style={styles.confirmYesText}>Flagging...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.confirmYesText}>Yes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={showFlagSuccess}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.notificationOverlay} pointerEvents="none">
                    <View style={styles.notificationCard}>
                        <View style={styles.notificationIconBox}>
                            <FontAwesome name="flag" size={22} color="#FFFFFF" />
                        </View>
                        <Text style={styles.notificationText}>Review Flagged</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Styles remain the same
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    userRating: {
        fontSize: 14,
        color: '#888',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#101820',
    },
    headerBar: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        zIndex: 1,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        paddingTop: 56,
        paddingBottom: 20,
    },
    reviewCard: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        elevation: 2,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    reviewerAvatarInitials: {
        fontSize: 14,
    },
    reviewerName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    reviewDate: {
        fontSize: 12,
        color: '#888',
    },
    reviewContent: {
        marginTop: 10,
    },
    ratingContainer: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    star: {
        fontSize: 20,
        color: '#ccc',
    },
    selectedStar: {
        fontSize: 20,
        color: '#FFD700', // Gold color for selected stars
    },
    reviewTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    reviewText: {
        fontSize: 14,
        color: '#333',
    },
    cardActionButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#2FA84F',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 17,
        fontWeight: '700',
        color: '#000000',
    },
    emptySubtitle: {
        marginTop: 6,
        maxWidth: 320,
        fontSize: 13,
        lineHeight: 20,
        color: '#8E8E93',
        textAlign: 'center',
    },
    emptyActionButton: {
        marginTop: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    emptyActionText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '500',
        color: '#8E8E93',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    confirmModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingHorizontal: 24,
        paddingTop: 26,
        paddingBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 8,
    },
    confirmTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#252525',
        marginBottom: 18,
    },
    confirmMessage: {
        fontSize: 18,
        lineHeight: 25,
        color: '#2E2E2E',
    },
    confirmWarning: {
        marginTop: 6,
        fontSize: 18,
        lineHeight: 25,
        color: '#FF3B30',
        fontWeight: '800',
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 28,
        gap: 12,
    },
    confirmCancelButton: {
        minWidth: 96,
        minHeight: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    confirmCancelText: {
        color: '#1E6FAF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
    confirmYesButton: {
        minWidth: 96,
        minHeight: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#101820',
        paddingHorizontal: 18,
    },
    confirmDisabledButton: {
        opacity: 0.72,
    },
    confirmYesText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    flaggingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notificationOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 72,
        backgroundColor: 'rgba(0, 0, 0, 0.12)',
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#101820',
        borderRadius: 22,
        paddingVertical: 14,
        paddingHorizontal: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 6,
    },
    notificationIconBox: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
});

export default UserReviewsScreen;
