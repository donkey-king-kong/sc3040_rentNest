import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

const notificationBellIcon = require('../assets/images/notificationBell.png');
import { FontAwesome } from '@expo/vector-icons';
import MorphingInfinity from '../components/MorphingInfinity';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import FairPriceCard from '../components/FairPriceCard';
import useFairPriceEstimate from '../hooks/useFairPriceEstimate';
import { normalizeListingImageUrl } from '../components/ListingImage';

const EditListingScreen = () => {
    const router = useRouter();
    const { listingId } = useLocalSearchParams();
    const [modalVisible, setModalVisible] = useState(false);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const notificationTimeoutRef = useRef(null);
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
                    router.replace('/LandingScreen');
                    return;
                }
                setToken(token);

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
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [listingId]);

    // AI Fair-Pricing Model: suggested range updates as the owner edits the form
    const { estimate: fairPrice, loading: fairPriceLoading } = useFairPriceEstimate({
        token,
        type: listing.type,
        postal: listing.postal,
        beds: listing.beds,
        size: listing.size,
        floor: listing.floor,
    });

    const handleTypeSelect = (type) => {
        setListing({ ...listing, type });
    };

    const handleInputChange = (field, value) => {
        setListing({ ...listing, [field]: value });
    };

    const formatWithCommas = (val) => {
        const digits = String(val).replace(/\D/g, '');
        if (!digits) return '';
        return Number(digits).toLocaleString('en-US');
    };

    const handlePriceChange = (text) => {
        const digits = text.replace(/\D/g, '');
        setListing({ ...listing, price: digits });
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
            setIsSaving(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                router.replace('/LandingScreen');
                return;
            }

            const requestBody = {
                ...listing,
                listingpicture: normalizeListingImageUrl(listing.listingpicture),
            };
            console.log('[EditListingScreen] submitting listing image:', {
                listingId,
                originalUrl: listing.listingpicture,
                normalizedUrl: requestBody.listingpicture,
            });

            await axios.put(
                `${API_BASE_URL}/api/listings/${listingId}`,
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            setModalVisible(true);
            notificationTimeoutRef.current = setTimeout(() => {
                setModalVisible(false);
                router.replace({ pathname: '/RentalInfoOwnerScreen', params: { listingId } });
            }, 2000);
        } catch (error) {
            console.error('Error updating listing:', error);
            Alert.alert('Error', 'Failed to update listing');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <MorphingInfinity size={86} color="#2FA84F" />
                <Text style={styles.loadingText}>Loading listing...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome name="chevron-left" size={18} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.heading}>Edit Listing</Text>
                </View>

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
                        maxLength={6}
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
                <View style={styles.priceInputRow}>
                    <Text style={[styles.priceDollar, !listing.price && styles.priceDollarPlaceholder]}>$</Text>
                    <TextInput
                        style={styles.priceInput}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        value={formatWithCommas(listing.price)}
                        onChangeText={handlePriceChange}
                    />
                </View>
                {(fairPrice || fairPriceLoading) && (
                    <FairPriceCard
                        compact
                        estimate={fairPrice}
                        loading={fairPriceLoading}
                        askingPrice={listing.price}
                        onUseSuggested={(mid) => handleInputChange('price', String(mid))}
                    />
                )}

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
                    value={listing.listingpicture || ''}
                    onChangeText={(value) => handleInputChange('listingpicture', value)}
                />

                {/* Update Listing Button */}
                <TouchableOpacity
                    style={[styles.postButton, isSaving && styles.postButtonDisabled]}
                    onPress={handleUpdateListing}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <View style={styles.savingContent}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.postButtonText}>Saving...</Text>
                        </View>
                    ) : (
                        <Text style={styles.postButtonText}>Update Listing</Text>
                    )}
                </TouchableOpacity>

                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                >
                    <View style={styles.notificationOverlay} pointerEvents="none">
                        <View style={styles.notificationCard}>
                            <View style={styles.notificationIconBox}>
                                <Image source={notificationBellIcon} style={styles.notificationIcon} />
                            </View>
                            <Text style={styles.notificationText}>Listing Updated</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#555',
    },
    scrollContainer: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
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
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginTop: 5,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    priceDollar: {
        fontSize: 16,
        color: '#000',
        paddingVertical: 10,
        paddingRight: 4,
    },
    priceDollarPlaceholder: {
        color: '#999',
    },
    priceInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: 10,
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
    postButtonDisabled: {
        opacity: 0.72,
    },
    savingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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

export default EditListingScreen;
