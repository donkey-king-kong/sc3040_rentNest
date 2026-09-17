import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const EditListingScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { listingId } = route.params;
    const [modalVisible, setModalVisible] = useState(false);
    const [listing, setListing] = useState({
        ownerUserID: 1,
        tenantUserID: 2,
        name: '',
        type: '',
        floor: '',
        unitNumber: '',
        location: '',
        postal: '',
        price: '',
        size: '',
        beds: '',
        bathroom: '',
        description: '',
        imageUrl: '',
    });

    useEffect(() => {
        const fetchListing = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    navigation.navigate('LandingScreen');
                    return;
                }

                const response = await axios.get(`${API_BASE_URL}/api/listings/${listingId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                setListing(response.data);
            } catch (error) {
                console.error('Error fetching listing data:', error);
                Alert.alert('Error', 'Failed to load listing data');
                navigation.goBack();
            }
        };

        fetchListing();
    }, [listingId]);

    const handleTypeSelect = (type) => {
        setListing({ ...listing, type });
    };

    const handleInputChange = (field, value) => {
        setListing({ ...listing, [field]: value });
    };

    const handleUpdateListing = async () => {
        // Validation checks
        if (!listing.name) return Alert.alert('Validation Error', 'Name is required.');
        if (!listing.location) return Alert.alert('Validation Error', 'Location is required.');
        //if (!listing.postal) return Alert.alert('Validation Error', 'Postal code is required.');
        if (!listing.type) return Alert.alert('Validation Error', 'Listing type is required.');
        if (!listing.price || isNaN(listing.price) || Number(listing.price) <= 0) return Alert.alert('Validation Error', 'Price must be a positive number.');
        if (!listing.beds || isNaN(listing.beds) || Number(listing.beds) < 0) return Alert.alert('Validation Error', 'Bedrooms should be a non-negative number.');
        if (!listing.bathroom || isNaN(listing.bathroom) || Number(listing.bathroom) < 0) return Alert.alert('Validation Error', 'Bathrooms should be a non-negative number.');
        if (!listing.floor || isNaN(listing.floor) || Number(listing.floor) < 0) return Alert.alert('Validation Error', 'Floor should be a non-negative number.');
        if (!listing.size || isNaN(listing.size) || Number(listing.size) <= 0) return Alert.alert('Validation Error', 'Size must be a positive number.');
        if (!listing.description) return Alert.alert('Validation Error', 'Description is required.');

        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                navigation.navigate('LandingScreen');
                return;
            }

            await axios.put(
                `${API_BASE_URL}/api/listings/${listingId}`,
                listing,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            setModalVisible(true);
        } catch (error) {
            console.error('Error updating listing:', error);
            Alert.alert('Error', 'Failed to update listing');
        }
    };

    const handleReturnHome = () => {
        setModalVisible(false);
        navigation.navigate('RentalInfoOwnerScreen', { listingId });
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.heading}>Edit Listing</Text>

                {/* Name */}
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter listing name"
                    placeholderTextColor="#999"
                    value={listing.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                />

                {/* Location */}
                <Text style={styles.label}>Location</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter location"
                    placeholderTextColor="#999"
                    value={listing.location}
                    onChangeText={(value) => handleInputChange('location', value)}
                />

                {/* Postal Code */}
                <Text style={styles.label}>Postal Code</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter postal code"
                        placeholderTextColor="#999"
                        value={listing.postal ? listing.postal.toString() : ''}
                        keyboardType="numeric"
                        onChangeText={(value) => handleInputChange('postal', parseInt(value) || '')}
                    />

                {/* Listing Type */}
                <Text style={styles.label}>Listing Type</Text>
                <View style={styles.typeContainer}>
                    {['HDB', 'Condo', 'Landed'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.typeButton,
                                listing.type === type && styles.selectedTypeButton
                            ]}
                            onPress={() => handleTypeSelect(type)}
                        >
                            <Text
                                style={[
                                    styles.typeButtonText,
                                    listing.type === type && styles.selectedTypeButtonText
                                ]}
                            >
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Listing Price */}
                <Text style={styles.label}>Listing Price</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter price"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={listing.price.toString()}
                    onChangeText={(value) => handleInputChange('price', value)}
                />

                {/* Rooms - Bedroom & Bathroom */}
                <Text style={styles.label}>Rooms</Text>
                <Text style={styles.smallLabel}>Bedrooms</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bedrooms"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={listing.beds.toString()}
                    onChangeText={(value) => handleInputChange('beds', value)}
                />
                <Text style={styles.smallLabel}>Bathrooms</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bathrooms"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={listing.bathroom.toString()}
                    onChangeText={(value) => handleInputChange('bathroom', value)}
                />

                {/* Unit Details - Floor & Size */}
                <Text style={styles.label}>Unit Details</Text>
                <Text style={styles.smallLabel}>Floor</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Floor"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={listing.floor.toString()}
                    onChangeText={(value) => handleInputChange('floor', value)}
                />
                <Text style={styles.smallLabel}>Unit Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Unit Number"
                    placeholderTextColor="#999"
                    value={listing.unitNumber}
                    onChangeText={(value) => handleInputChange('unitNumber', value)}
                />
                <Text style={styles.smallLabel}>Size (sq ft)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Size (sq ft)"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={listing.size.toString()}
                    onChangeText={(value) => handleInputChange('size', value)}
                />

                {/* Description */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description"
                    placeholderTextColor="#999"
                    multiline
                    value={listing.description}
                    onChangeText={(value) => handleInputChange('description', value)}
                />

                {/* Media - Image URL */}
                <Text style={styles.label}>Media</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter image URL"
                    placeholderTextColor="#999"
                    value={listing.imageUrl}
                    onChangeText={(value) => handleInputChange('imageUrl', value)}
                />

                {/* Update Listing Button */}
                <TouchableOpacity style={styles.postButton} onPress={handleUpdateListing}>
                    <Text style={styles.postButtonText}>Update Listing</Text>
                </TouchableOpacity>

                {/* Confirmation Modal */}
                <Modal
                    transparent={true}
                    visible={modalVisible}
                    animationType="slide"
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Image source={require('../assets/images/confirmation.png')} style={styles.confirmationImage} />
                            <Text style={styles.modalText}>Listing Updated Successfully!</Text>
                            <TouchableOpacity style={styles.returnButton} onPress={handleReturnHome}>
                                <Text style={styles.returnButtonText}>Return</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        padding: 20,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 15,
    },
    smallLabel: {
        fontSize: 12,
        color: '#777',
        marginTop: 5,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        marginTop: 5,
        fontSize: 16,
    },
    typeContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 5,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        marginRight: 5,
    },
    selectedTypeButton: {
        backgroundColor: '#fff',
        borderColor: '#000',
        borderWidth: 1,
    },
    typeButtonText: {
        fontSize: 16,
    },
    selectedTypeButtonText: {
        fontWeight: 'bold',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    postButton: {
        backgroundColor: '#222222',
        padding: 15,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
    },
    postButtonText: {
        color: '#fff',
        fontSize: 18,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'center',
    },
    confirmationImage: {
        width: 80,
        height: 80,
        borderRadius: 50,
        marginBottom: 20,
    },
    modalText: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: 'bold'
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

export default EditListingScreen;
