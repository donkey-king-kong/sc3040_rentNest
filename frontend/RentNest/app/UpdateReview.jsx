import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useRoute } from '@react-navigation/native';

const UpdateReview = () => {
    const route = useRoute();
    const { reviewId, reviewData } = route.params || {};

    // Placeholder review data if no review data is passed
    const defaultReview = {
        id: 'placeholder',
        rating: 4,
        title: 'Great Service!',
        content: 'The service provided was exceptional, and I highly recommend it to others.',
    };

    const [rating, setRating] = useState(reviewData?.rating || defaultReview.rating);
    const [reviewTitle, setReviewTitle] = useState(reviewData?.title || defaultReview.title);
    const [reviewText, setReviewText] = useState(reviewData?.content || defaultReview.content);
    const [modalVisible, setModalVisible] = useState(false);
    const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);

    const handleStarPress = (value) => {
        setRating(value);
    };

    const handleDeletePress = () => {
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleConfirmDelete = () => {
        setModalVisible(false);
        setDeleteSuccessVisible(true);
        // Reset review state
        setReviewTitle('');
        setReviewText('');
        setRating(0);
    };

    const handleCloseSuccessModal = () => {
        setDeleteSuccessVisible(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>Update Review</Text>

                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => handleStarPress(star)}
                            activeOpacity={0.7}
                        >
                            <Text style={rating >= star ? styles.selectedStar : styles.star}>
                                ★
                            </Text>
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
                    placeholder="Your Review"
                    value={reviewText}
                    onChangeText={setReviewText}
                    multiline
                    numberOfLines={4}
                />

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePress}>
                        <Text style={styles.deleteButtonText}>Delete Review</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.submitButton}>
                        <Text style={styles.submitButtonText}>Submit/Update Review</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Delete Confirmation Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Delete Review?</Text>
                            <TouchableOpacity onPress={handleCancel}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalText}>
                            This action cannot be reversed.
                        </Text>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDelete}>
                                <Text style={styles.confirmButtonText}>Confirm Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Success Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={deleteSuccessVisible}
                onRequestClose={handleCloseSuccessModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModalContent}>
                        <TouchableOpacity style={styles.closeButtonWrapper} onPress={handleCloseSuccessModal}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                        <View style={styles.successIconWrapper}>
                            <View style={styles.successIcon}>
                                <Text style={styles.successCheck}>✓</Text>
                            </View>
                        </View>
                        <Text style={styles.successTitle}>Review Deleted!</Text>
                        <Text style={styles.successText}>You can make a new review at any time.</Text>
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
        marginHorizontal: 2,
    },
    selectedStar: {
        fontSize: 40,
        color: '#FFD700',
        marginHorizontal: 2,
    },
    input: {
        height: 40,
        borderColor: '#000',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        borderColor: '#000',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 20,
        fontSize: 16,
        textAlignVertical: 'top',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#000',
        marginRight: 10,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButton: {
        flex: 1,
        backgroundColor: '#000',
        padding: 10,
        borderRadius: 5,
        marginLeft: 10,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        alignItems: 'center',
    },
    successModalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        alignItems: 'center',
    },
    successIconWrapper: {
        marginBottom: 10,
        alignItems: 'center',
    },
    successIcon: {
        backgroundColor: '#00C853',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successCheck: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    successText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 15,
    },
    closeButtonWrapper: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    closeButton: {
        fontSize: 24,
        color: '#000',
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        color: '#666',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        borderColor: '#000',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#000',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default UpdateReview;