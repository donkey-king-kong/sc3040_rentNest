import React, { useEffect, useState } from 'react';
import {View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_BASE_URL} from "../config/api";
import axios from "axios";

const UserReviewsScreen = () => {
    const route = useRoute();

    // Extract `userId` from the route parameters
    const { userId } = route.params || {};

    // Placeholder user data
    // const getRandomAvatar = () => {
    //     const randomNum = Math.floor(Math.random() * 10) + 1; // Random number between 1 and 10
    //     return `https://randomuser.me/api/portraits/lego/${randomNum}.jpg`;
    // };

    // State to hold the reviews, loading state, and error state
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    const data = await response.json();
                    const avatars = [
                        'https://randomuser.me/api/portraits/lego/1.jpg',
                        'https://randomuser.me/api/portraits/lego/2.jpg',
                        'https://randomuser.me/api/portraits/lego/3.jpg',
                        'https://randomuser.me/api/portraits/lego/4.jpg',
                        'https://randomuser.me/api/portraits/lego/5.jpg',
                    ];

                    // Use different avatar URLs based on review ID
                    setReviews(data.map((review, index) => {
                        // Try to parse the date, fall back if it's invalid
                        // let formattedDate;
                        // try {
                        //     const date = new Date(review.date);
                        //     formattedDate = !isNaN(date.getTime()) ? date.toLocaleDateString() : "Date not available";
                        // } catch {
                        //     formattedDate = "Date not available";
                        // }

                        return {
                            id: review.reviewID,
                            reviewer: review.reviewerName,
                            // date: formattedDate, // Formatting the date to be more readable
                            avatar: review.avatar || avatars[index % avatars.length], // Use different avatars for each review
                            rating: review.rating,
                            title: review.title,
                            content: review.text,
                            flagged: review.flagged,
                        };
                    }));

                } else if (response.status === 204) {
                    // Handle case where there are no reviews for the user
                    setReviews([]);
                    setError('No reviews found for the specified user.');
                } else {
                    throw new Error("Error fetching user reviews. Status code: " + response.status);
                }
            } catch (error) {
                console.error("Error fetching user reviews:", error);
                setError(error.message);
            } finally {
                setLoading(false); // Stop loading after the request completes
            }
        };

        fetchUserReviews();
    }, [userId]);

// Function to handle flagging/unflagging a review with user confirmation
    const handleFlagReview = (reviewId, currentlyFlagged) => {
        // Alert to confirm flagging or unflagging
        Alert.alert(
            currentlyFlagged ? "Unflag Review" : "Flag Review",
            `Are you sure you want to ${currentlyFlagged ? "unflag" : "flag"} this review? This cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Yes",
                    onPress: () => {
                        // Update the flagged state locally if user confirms
                        setReviews((prevReviews) =>
                            prevReviews.map((review) =>
                                review.id === reviewId ? { ...review, flagged: !currentlyFlagged } : review
                            )
                        );
                        Alert.alert("Success", `The review has been ${currentlyFlagged ? "unflagged" : "flagged"}.`);
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const renderReview = ({ item }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewerInfo}>
                <Image source={{ uri: item.avatar }} style={styles.reviewerAvatar} />
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
            {/* Flag button for each review */}
            <TouchableOpacity
                style={styles.flagButton}
                onPress={() => handleFlagReview(item.id)}
                disabled={item.flagged}  // Disable button if already flagged
            >
                <Text style={[styles.flagText, item.flagged && styles.flaggedText]}>⚑</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {error ? (
                <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
            ) : (
                <>
                    <Text style={styles.header}>Reviews</Text>
                    <FlatList
                        data={reviews}
                        renderItem={renderReview}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                    />
                </>
            )}
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
        marginBottom: 20,
    },
    list: {
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
    flagButton: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    flagText: {
        fontSize: 18,
        color: '#888',
    },
    flaggedText: {
        color: 'red',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default UserReviewsScreen;
