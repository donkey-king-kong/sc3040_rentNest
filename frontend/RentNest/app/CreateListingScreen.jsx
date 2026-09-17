import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationBar from '../components/NavigationBar';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const CreateListingScreen = () => {
    const navigation = useNavigation();
    const [token, setToken] = useState(null);
    const [listing, setListing] = useState({
        ownerUserID: null,
        ownerName: null,
        ownerPhotoURL: null,
        tenantUserID: null,
        name: null,
        type: null,
        floor: null,
        unitNumber: null,
        location: null,
        postal: null,
        price: null,
        size: null,
        beds: null,
        bathroom: null,
        description: null,
        listingpicture: null,
    });
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const loadUserDataAndToken = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                setToken(token);
                
                if (!token) {
                  console.log('No token found!');
                  router.replace('/LoginScreen');
                  return;
                }

                const decodedToken = jwtDecode(token);
                const email = decodedToken.sub;
          
                const response = await axios.get(`${API_BASE_URL}/api/users/${email}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                  },
                });

                // Set the ownerUserID from the response
                setListing(prev => ({
                    ...prev,
                    ownerUserID: response.data.userID,
                    ownerName: response.data.name,
                    ownerPhotoURL: response.data.photoURL
                }));
            } catch (error) {
                console.error('Error loading data:', error);
                Alert.alert('Error', 'Failed to load user data');
            }
        };

        loadUserDataAndToken();
    }, []);

    const handleTypeSelect = (type) => {
        setListing({ ...listing, type });
    };

    const handleInputChange = (field, value) => {
        setListing({ ...listing, [field]: value });
    };

    const handlePostListing = async () => {
        if (!token) return Alert.alert('Error', 'You must be logged in to create a listing.');
        if (!listing.ownerUserID) return Alert.alert('Error', 'You must be logged in to create a listing.');
        if (!listing.name) return Alert.alert('Validation Error', 'Name is required.');
        if (!listing.location) return Alert.alert('Validation Error', 'Location is required.');
        if (!listing.type) return Alert.alert('Validation Error', 'Listing type is required.');
        if (!listing.price || isNaN(listing.price) || Number(listing.price) <= 0) return Alert.alert('Validation Error', 'Price must be a positive number.');
        if (!listing.beds || isNaN(listing.beds) || Number(listing.beds) < 0) return Alert.alert('Validation Error', 'Bedrooms should be a non-negative number.');
        if (!listing.bathroom || isNaN(listing.bathroom) || Number(listing.bathroom) < 0) return Alert.alert('Validation Error', 'Bathrooms should be a non-negative number.');
        if (!listing.floor || isNaN(listing.floor) || Number(listing.floor) < 0) return Alert.alert('Validation Error', 'Floor should be a non-negative number.');
        if (!listing.size || isNaN(listing.size) || Number(listing.size) <= 0) return Alert.alert('Validation Error', 'Size must be a positive number.');
        if (!listing.unitNumber) return Alert.alert('Validation Error', 'Unit number is required.');
        if (!listing.postal) return Alert.alert('Validation Error', 'Postal code is required.');
        if (!listing.description) return Alert.alert('Validation Error', 'Description is required.');

        try {
            const requestBody = {
                ownerUserID: listing.ownerUserID,
                ownerName: listing.ownerName,
                ownerPhotoURL: listing.ownerPhotoURL,
                tenantUserID: null,
                name: listing.name,
                type: listing.type,
                floor: Number(listing.floor),
                unitNumber: listing.unitNumber,
                location: listing.location,
                postal: Number(listing.postal),
                price: Number(listing.price),
                size: Number(listing.size),
                beds: Number(listing.beds),
                bathroom: Number(listing.bathroom),
                description: listing.description,
                flagged: false,
                listingpicture: listing.listingpicture
            };

            const response = await axios.post(`${API_BASE_URL}/api/listings`, requestBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setModalVisible(true);
        } catch (error) {
            Alert.alert('Error', error.response?.data || 'Failed to create listing');
        }
    };

    const handleReturnHome = () => {
        setModalVisible(false);
        navigation.navigate('HomeScreen');
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.heading}>Create Listing</Text>

                {/* Name */}
                <Text style={styles.label}>Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter listing name"
                    placeholderTextColor="#666"
                    value={listing.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                />

                {/* Location */}
                <Text style={styles.label}>Location</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter location"
                    placeholderTextColor="#666"
                    value={listing.location}
                    onChangeText={(value) => handleInputChange('location', value)}
                />

                {/* Postal Code */}
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter postal code"
                    placeholderTextColor="#666"
                    value={listing.postal}
                    onChangeText={(value) => handleInputChange('postal', value)}
                />

                {/* Listing Type */}
                <Text style={styles.label}>Listing Type</Text>
                <View style={styles.typeContainer}>
                    {['HDB', 'Condo', 'Landed'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.typeButton, listing.type === type && styles.selectedTypeButton]}
                            onPress={() => handleTypeSelect(type)}
                        >
                            <Text style={[styles.typeButtonText, listing.type === type && styles.selectedTypeButtonText]}>
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
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={listing.price}
                    onChangeText={(value) => handleInputChange('price', value)}
                />

                {/* Rooms - Bedroom & Bathroom */}
                <Text style={styles.label}>Rooms</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bedrooms"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={listing.beds}
                    onChangeText={(value) => handleInputChange('beds', value)}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Bathrooms"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={listing.bathroom}
                    onChangeText={(value) => handleInputChange('bathroom', value)}
                />

                {/* Unit Details - Floor, Unit Number & Size */}
                <Text style={styles.label}>Unit Details</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Floor"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={listing.floor}
                    onChangeText={(value) => handleInputChange('floor', value)}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Unit Number"
                    placeholderTextColor="#666"
                    value={listing.unitNumber}
                    onChangeText={(value) => handleInputChange('unitNumber', value)}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Size (sq ft)"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={listing.size}
                    onChangeText={(value) => handleInputChange('size', value)}
                />

                {/* Description */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description"
                    placeholderTextColor="#666"
                    multiline
                    value={listing.description}
                    onChangeText={(value) => handleInputChange('description', value)}
                />

                {/* Media - Image URL */}
                <Text style={styles.label}>Media</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter image URL"
                    placeholderTextColor="#666"
                    value={listing.listingpicture}
                    onChangeText={(value) => handleInputChange('listingpicture', value)}
                />

                {/* Post Listing Button */}
                <TouchableOpacity style={styles.postButton} onPress={handlePostListing}>
                    <Text style={styles.postButtonText}>Post Listing</Text>
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
                            <Text style={styles.modalText}>Listing Created Successfully!</Text>
                            <TouchableOpacity style={styles.returnButton} onPress={handleReturnHome}>
                                <Text style={styles.returnButtonText}>Return to Home</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>

            {/* Navigation Bar */}
            <NavigationBar />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#000',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 15,
        color: '#000',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        fontSize: 18,
        color: '#000',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    typeContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
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
        fontWeight: 'bold',
        color: '#666',
    },
    selectedTypeButtonText: {
        color: '#000',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    postButton: {
        backgroundColor: '#000',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        width: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    confirmationImage: {
        width: 100,
        height: 100,
        marginBottom: 20,
    },
    modalText: {
        fontSize: 18,
        marginBottom: 20,
        color: '#000',
        fontWeight: '500',
    },
    returnButton: {
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
    },
    returnButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateListingScreen;
