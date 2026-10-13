// Previous imports remain unchanged
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import MapView, { Marker } from '../components/AppMap';
import {useRouter, useLocalSearchParams} from "expo-router";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { startPricingRequestLog } from '../config/pricingDiagnostics';
import { jwtDecode } from 'jwt-decode';
import MorphingInfinity from '../components/MorphingInfinity';
import FairPriceCard from '../components/FairPriceCard';
import PriceInsightsChart from '../components/PriceInsightsChart';
import ListingImage from '../components/ListingImage';
import ProfileImage from '../components/ProfileImage';

const notificationBellIcon = require('../assets/images/notificationBell.png');
const PRICING_REQUEST_TIMEOUT_MS = 25_000;

const isPricingTimeout = (error, startedAt) => error?.code === 'ECONNABORTED'
  || error?.code === 'ETIMEDOUT'
  || (
    error?.code === 'ERR_NETWORK'
    && Date.now() - startedAt >= PRICING_REQUEST_TIMEOUT_MS * 0.95
  );

const HomeListingScreen = () => {
  const router = useRouter();
  const { listingId } = useLocalSearchParams();

  const [listing, setListing] = useState(null);
  const [nearbySchools, setNearbySchools] = useState([]);
  const [nearbyHawkerCentres, setNearbyHawkerCentres] = useState([]);
  const [nearbyBusStops, setNearbyBusStops] = useState([]);
  const [priceInsights, setPriceInsights] = useState([]);
  const [fairPrice, setFairPrice] = useState(null);
  const [fairPriceLoading, setFairPriceLoading] = useState(true);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesError, setAmenitiesError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [priceInsightsLoading, setPriceInsightsLoading] = useState(false);
  const [priceInsightsError, setPriceInsightsError] = useState('');
  const [secondaryRevision, setSecondaryRevision] = useState(0);
  const [pricingRevision, setPricingRevision] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Schools');
  const [loading, setLoading] = useState(true);
  const [initialPricingSettled, setInitialPricingSettled] = useState(false);
  const [initialSecondarySettled, setInitialSecondarySettled] = useState(false);
  const [token, setToken] = useState('');
  const [currentUserID, setCurrentUserID] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 1.3521,
    longitude: 103.8198,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const authHeaders = useCallback((tokenValue) => ({
    'Authorization': `Bearer ${tokenValue}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }), []);

  // Memoize getNearbyPlaces to prevent unnecessary recalculations
  const getNearbyPlaces = useCallback(() => {
    switch (selectedCategory) {
      case 'Schools':
        return { data: nearbySchools, coordinates: nearbySchools[0] || { latitude: 1.3521, longitude: 103.8198 } };
      case 'Hawker Centres':
        return { data: nearbyHawkerCentres, coordinates: nearbyHawkerCentres[0] || { latitude: 1.3702, longitude: 103.8681 } };
      case 'Bus Stops':
        return { data: nearbyBusStops, coordinates: nearbyBusStops[0] || { latitude: 1.3555, longitude: 103.8250 } };
      default:
        return { data: [], coordinates: { latitude: 1.3521, longitude: 103.8198 } };
    }
  }, [selectedCategory, nearbySchools, nearbyHawkerCentres, nearbyBusStops]);

  // Update map region when category or data changes
  useEffect(() => {
    const { coordinates } = getNearbyPlaces();
    setMapRegion(prev => ({
      ...prev,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }));
  }, [selectedCategory, nearbySchools, nearbyHawkerCentres, nearbyBusStops]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCore = async () => {
      setLoading(true);
      setListing(null);
      setFairPrice(null);
      setAiExplanation(null);
      setInitialPricingSettled(false);
      setInitialSecondarySettled(false);
      try {
        const tokenValue = await AsyncStorage.getItem('token');
        if (!tokenValue) {
          router.replace('/LoginScreen');
          return;
        }
        setToken(tokenValue);
        const userEmail = jwtDecode(tokenValue).sub;
        const config = { headers: authHeaders(tokenValue), signal: controller.signal, timeout: 15_000 };
        const [userResponse, listingResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/users/${userEmail}`, config),
          axios.get(`${API_BASE_URL}/api/listings/${listingId}`, config),
        ]);
        if (controller.signal.aborted) return;
        setCurrentUserID(userResponse.data.userID);
        const data = listingResponse.data || {};
        const isDemo = data.demo === true;
        setListing({
          isDemo,
          name: data.name || 'No Name Available',
          location: data.location || 'Location not available',
          price: data.price || 0,
          rating: 4.0,
          pincode: data.postal || (isDemo ? 'Not provided' : 489836),
          type: data.type || 'Not specified',
          rentalType: 'Room Rental',
          description: isDemo
            ? (data.description || '').replace('FICTIONAL DEMO:', 'SAMPLE LISTING:').replace(/\bdemo\b/gi, 'sample')
            : (data.description || 'No description available'),
          beds: data.beds || 0,
          baths: data.bathroom || 0,
          size: data.size || 1,
          imageURL: data.listingpicture,
          ownerUserID: data.ownerId || '',
          ownerName: isDemo ? 'Sample Property Owner' : (data.ownerName || 'Unknown'),
          ownerPhotoURL: data.ownerPhotoURL || null,
        });
        axios.post(`${API_BASE_URL}/api/listings/${listingId}/views`, {}, {
          headers: authHeaders(tokenValue),
        }).catch(() => {});
      } catch (error) {
        if (!controller.signal.aborted && error?.response?.status === 401) {
          router.replace('/LoginScreen');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadCore();
    return () => controller.abort();
  }, [authHeaders, listingId, router]);

  useEffect(() => {
    if (!listing || !token) return;
    if (listing.isDemo) {
      setFairPriceLoading(false);
      setAiExplanationLoading(false);
      setInitialPricingSettled(true);
      return;
    }
    const controller = new AbortController();
    const headers = authHeaders(token);
    setFairPriceLoading(true);
    setAiExplanationLoading(true);
    setFairPrice(null);
    setAiExplanation(null);
    const estimateStartedAt = Date.now();
    const explanationStartedAt = Date.now();
    const estimateLog = startPricingRequestLog(
      'estimate', listingId, PRICING_REQUEST_TIMEOUT_MS,
    );
    const explanationLog = startPricingRequestLog(
      'explanation', listingId, PRICING_REQUEST_TIMEOUT_MS,
    );
    const estimateRequest = axios.get(`${API_BASE_URL}${ENDPOINTS.PRICING_FOR_LISTING(listingId)}`, {
      headers, signal: controller.signal, timeout: PRICING_REQUEST_TIMEOUT_MS,
    }).then(response => {
      estimateLog.completed(response);
      setFairPrice(response.data);
    }).catch(error => {
      if (!controller.signal.aborted) {
        estimateLog.failed(error);
        setFairPrice({
          available: false,
          message: isPricingTimeout(error, estimateStartedAt)
            ? 'Pricing is taking longer than expected. Retry pricing; the result may be ready now.'
            : 'Could not reach the pricing service.',
        });
      }
    }).finally(() => {
      if (!controller.signal.aborted) setFairPriceLoading(false);
    });
    const explanationRequest = axios.get(`${API_BASE_URL}${ENDPOINTS.PRICING_EXPLANATION(listingId)}`, {
      headers, signal: controller.signal, timeout: PRICING_REQUEST_TIMEOUT_MS,
    }).then(response => {
      explanationLog.completed(response);
      setAiExplanation(response.data);
    }).catch(error => {
      if (!controller.signal.aborted) {
        explanationLog.failed(error);
        setAiExplanation({
          available: false,
          message: isPricingTimeout(error, explanationStartedAt)
            ? 'The AI explanation is taking longer than expected. Please retry.'
            : 'Could not reach the AI explanation service.',
        });
      }
    }).finally(() => {
      if (!controller.signal.aborted) setAiExplanationLoading(false);
    });
    Promise.allSettled([estimateRequest, explanationRequest]).then(() => {
      if (!controller.signal.aborted) setInitialPricingSettled(true);
    });
    return () => controller.abort();
  }, [authHeaders, listing, listingId, pricingRevision, token]);

  useEffect(() => {
    if (!listing || !token) return;
    if (listing.isDemo) {
      setInitialSecondarySettled(true);
      return;
    }
    const controller = new AbortController();
    const config = { headers: authHeaders(token), signal: controller.signal, timeout: 20_000 };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const applyAmenities = amenities => {
      setNearbySchools(amenities.filter(item => item.amenity_type === 'school').map(item => ({
        schoolName: item.name, latitude: item.latitude, longitude: item.longitude,
        distanceMeters: item.distance_meters,
      })));
      setNearbyHawkerCentres(amenities.filter(item => item.amenity_type === 'hawker_centre').map(item => ({
        nameOfCentre: item.name, latitude: item.latitude, longitude: item.longitude,
        distanceMeters: item.distance_meters,
      })));
      setNearbyBusStops(amenities.filter(item => item.amenity_type === 'bus_stop').map(item => ({
        description: item.name, latitude: item.latitude, longitude: item.longitude,
        distanceMeters: item.distance_meters,
      })));
    };
    const loadAmenities = async () => {
      setAmenitiesLoading(true);
      setAmenitiesError('');
      try {
        for (let attempt = 0; attempt < 30 && !controller.signal.aborted; attempt += 1) {
          const response = await axios.get(
            `${API_BASE_URL}/api/gov/nearby-amenities/${listingId}`, config,
          );
          const payload = response.data || {};
          const amenities = Array.isArray(payload) ? payload : (payload.amenities || []);
          const status = Array.isArray(payload) ? 'READY' : payload.status;
          if (status === 'READY' || amenities.length > 0) {
            applyAmenities(amenities);
            return;
          }
          if (status !== 'LOADING') {
            applyAmenities([]);
            return;
          }
          await wait(2_000);
        }
        if (!controller.signal.aborted) setAmenitiesError('Nearby places are still being prepared.');
      } catch {
        if (!controller.signal.aborted) setAmenitiesError('Nearby places could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setAmenitiesLoading(false);
      }
    };
    const loadPrices = async () => {
      setPriceInsightsLoading(true);
      setPriceInsightsError('');
      try {
        const response = await axios.get(`${API_BASE_URL}/api/gov/rentalprices/${listingId}`, config);
        const unique = {};
        (Array.isArray(response.data) ? response.data : []).forEach(item => {
          if (!unique[item.leaseDate] || item.rentPrice > unique[item.leaseDate].rentPrice) {
            unique[item.leaseDate] = item;
          }
        });
        setPriceInsights(Object.values(unique));
      } catch {
        if (!controller.signal.aborted) setPriceInsightsError('Rental price history could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setPriceInsightsLoading(false);
      }
    };
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/reviews/byUser/${listing.ownerUserID}`, config,
        );
        setReviews((Array.isArray(response.data) ? response.data : []).map(review => ({
          reviewId: review.reviewID ?? review.reviewid ?? review.id,
          rating: review.rating,
          title: review.title || 'Review',
          text: review.text,
          user: {
            userID: review.reviewerID ?? review.reviewerId ?? review.userId,
            name: review.reviewerName || review.userName || 'Anonymous',
            photoURL: review.reviewerPhotoURL || review.userPhotoURL || null,
          },
          flagged: review.flagged || false,
        })));
      } catch {
        if (!controller.signal.aborted) setReviewsError('Reviews could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setReviewsLoading(false);
      }
    };
    Promise.allSettled([
      loadAmenities(),
      loadPrices(),
      loadReviews(),
    ]).then(() => {
      if (!controller.signal.aborted) setInitialSecondarySettled(true);
    });
    return () => controller.abort();
  }, [authHeaders, listing, listingId, secondaryRevision, token]);

  const [modalVisible, setModalVisible] = useState(false);
  const [isReportingListing, setIsReportingListing] = useState(false);
  const [listingNotificationMessage, setListingNotificationMessage] = useState('');
  const notificationTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const getReportStorageKey = () => {
    if (!currentUserID || !listingId) {
      return null;
    }

    return `reportedListing:${currentUserID}:${listingId}`;
  };

  const showListingNotification = (message) => {
    setListingNotificationMessage(message);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setListingNotificationMessage('');
    }, 2000);
  };

  const syncListingReportStatus = async (reportStorageKey) => {
    if (!reportStorageKey || !token) {
      return;
    }

    const response = await axios.get(`${API_BASE_URL}/api/listings/${listingId}`, {
      headers: authHeaders(token)
    });
    const isListingFlagged = response.data?.flagged === true || Number(response.data?.flagged) === 1;

    if (!isListingFlagged) {
      await AsyncStorage.removeItem(reportStorageKey);
    }
  };

  const handleReportListing = async () => {
    console.log('Report listing clicked');
    const reportStorageKey = getReportStorageKey();

    if (!reportStorageKey) {
      setModalVisible(true);
      return;
    }

    try {
      await syncListingReportStatus(reportStorageKey);
      const alreadyReported = await AsyncStorage.getItem(reportStorageKey);
      if (alreadyReported === 'true') {
        showListingNotification('Listing Already Reported');
        return;
      }
    } catch (err) {
      console.error(`Error checking reported listing status: ${err.message}`);
    }

    setModalVisible(true);
  };

  const handleConfirm = async () => {
    if (isReportingListing) {
      return;
    }

    try {
      setIsReportingListing(true);
      const reportStorageKey = getReportStorageKey();
      // axios.put(url, body, config): headers belong in the third argument
      await axios.put(`${API_BASE_URL}/api/listings/setFlag/${listingId}/true`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (reportStorageKey) {
        await AsyncStorage.setItem(reportStorageKey, 'true');
      }
      setModalVisible(false);
      showListingNotification('Listing Reported');
    } catch (err) {
      console.error(`Error reporting listing: ${err.message}`);
      setModalVisible(false);
      showListingNotification('Report not sent. Please try again.');
    } finally {
      setIsReportingListing(false);
    }
  };

  const handleCancel = () => {
    if (isReportingListing) {
      return;
    }

    setModalVisible(false);
  };

  const handleChat = () => {
    router.push({ pathname: '/ChatsScreen2', params: {
      partnerUserId: listing.ownerUserID, currentUser: currentUserID, enquiryListingId: listingId,
    } });
  };

  // Memoize the price per square foot calculation
  const pricePerSqft = useMemo(() => 
    listing ? (listing.price / listing.size).toFixed(2) : '0.00',
    [listing]
  );

  // Memoize the nearby places data
  const { data } = useMemo(() => getNearbyPlaces(), [getNearbyPlaces]);

  if (!loading && !listing) {
    return <View style={styles.loadingScreen}>
      <Text style={styles.loadingText}>Listing unavailable</Text>
      <Text>This listing may have been removed or could not be loaded.</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={{ padding: 16 }}>
        <Text>Back to conversation</Text>
      </TouchableOpacity>
    </View>;
  }

  const initialListingLoading = loading
    || (listing && (!initialPricingSettled || !initialSecondarySettled));

  if (initialListingLoading) {
    return (
      <View style={styles.loadingScreen}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.box}>
        <View style={styles.imageWrapper}>
          <ListingImage
            uri={listing.imageURL}
            style={styles.image}
            screen="HomeListingScreen"
            listingId={listingId}
            listingName={listing.name}
            width={600}
            height={400}
            diagnostics={false}
          />
        </View>
        <View style={styles.container}>
        {/* Display the name and address */}
        <Text style={styles.name}>{listing.name}</Text>
        <Text style={styles.location}>{listing.location}</Text>

        {/* Display the price */}
        <Text style={styles.price}>${listing.price}/month</Text>

        {/* Display the apartment type */}
        <Text style={styles.type}>Apartment Type: {listing.type}</Text>

        {/* AI Fair-Pricing Model: how the asking price compares with the market */}
        <FairPriceCard
          estimate={fairPrice}
          loading={fairPriceLoading}
          askingPrice={listing.price}
          aiExplanation={aiExplanation}
          aiExplanationLoading={aiExplanationLoading}
          onRetry={() => setPricingRevision(value => value + 1)}
        />

        {/* Gray line above the icons */}
        <View style={styles.line} />

        {/* Icons row for beds, baths, sqft, price per sqft */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <FontAwesome name="bed" size={22} color="gray" />
            <Text style={styles.infoText}>{listing.beds} Beds</Text>
          </View>
          <View style={styles.infoBox}>
            <FontAwesome name="bath" size={22} color="gray" />
            <Text style={styles.infoText}>{listing.baths} Baths</Text>
          </View>
          <View style={styles.infoBox}>
            <FontAwesome name="expand" size={22} color="gray" />
            <Text style={styles.infoText}>{listing.size} sqft</Text>
          </View>
          <View style={styles.infoBox}>
            <FontAwesome name="dollar" size={22} color="gray" />
            <Text style={styles.infoText}>${pricePerSqft}/sqft</Text>
          </View>
        </View>

        {/* Gray line below the icons */}
        <View style={styles.line} />

        {/* Label for description */}
        <Text style={styles.descriptionLabel}>Description</Text>

        {/* Display the description */}
        <Text style={styles.description}>{listing.description}</Text>

        {/* Display listing ID for future backend connection */}
        {/*<Text style={styles.listingId}>Listing ID: {listingId}</Text>*/}

        {listing.isDemo && <Text style={{ color: '#805300', marginVertical: 12 }}>
          Sample listing. Photo is illustrative; prices and property details are invented for testing. No verified address, nearby amenities or market-price comparison.
        </Text>}
        {!listing.isDemo && <>
        {/* Heading for the location section */}
        <Text style={styles.schoolsLabel}>About the Location</Text>

        {/* Toggle buttons for Schools, Hawker Centres, and Bus Stops */}
        <View style={styles.toggleContainer}>
          {['Schools', 'Hawker Centres', 'Bus Stops'].map((category) => (
            <TouchableOpacity key={category} onPress={() => setSelectedCategory(category)}>
              <Text style={[
                styles.toggleText,
                selectedCategory === category && styles.selectedToggleText,
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Map to show nearby places */}
        {amenitiesLoading && data.length === 0 ? (
          <View style={styles.sectionStatus}>
            <ActivityIndicator size="small" color="#2FA84F" />
            <Text style={styles.sectionStatusText}>Loading nearby places...</Text>
          </View>
        ) : amenitiesError ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setSecondaryRevision(value => value + 1)}
            style={styles.sectionStatus}
          >
            <Text style={styles.sectionErrorText}>{amenitiesError} Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <MapView
            style={styles.map}
            region={mapRegion}
          >
            {data.map((place, index) => (
              <Marker
                key={index}
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={selectedCategory === 'Schools' ? place.schoolName :
                       selectedCategory === 'Hawker Centres' ? place.nameOfCentre :
                       place.description}
              />
            ))}
          </MapView>
        )}

        {/* Display nearby places in boxes */}
         <View style={styles.placesContainer}>
             {data.length > 0 ? (
                 data.map((place, index) => (
                     <View key={index} style={styles.placeBox}>
                         <Text style={styles.placeName} numberOfLines={1}>
                             {selectedCategory === 'Schools' ? place.schoolName : selectedCategory === 'Hawker Centres' ? place.nameOfCentre : place.description}
                         </Text>
                     </View>
                 ))
             ) : !amenitiesLoading && !amenitiesError ? (
                 <Text style={styles.noPlaces}>No places nearby.</Text>
              ) : null}
          </View>

      <View style={styles.reviewsContainer}>
        <Text style={styles.reviewsHeader}>Reviews</Text>
          {reviewsLoading && reviews.length === 0 ? (
            <View style={styles.sectionStatus}>
              <ActivityIndicator size="small" color="#2FA84F" />
              <Text style={styles.sectionStatusText}>Loading reviews...</Text>
            </View>
          ) : reviewsError ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setSecondaryRevision(value => value + 1)}
              style={styles.sectionStatus}
            >
              <Text style={styles.sectionErrorText}>{reviewsError} Tap to retry.</Text>
            </TouchableOpacity>
          ) : reviews.length > 0 ? (
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
             {reviews.map((review) => (
              <View key={review.reviewId} style={styles.reviewBox}>
                <View style={styles.starsContainer}>
                  {[...Array(5)].map((_, index) => (
                    <FontAwesome
                      key={index}
                      name={index < review.rating ? "star" : "star-o"}
                      size={20}
                       color="#000" // Stars are black
                    />
                  ))}
                </View>
                <Text style={styles.reviewTitle}>{review.title}</Text>
                <Text style={styles.reviewText}>{review.text}</Text>
                <View style={styles.userInfo}>
                  <ProfileImage
                    uri={review.user.photoURL}
                    name={review.user.name}
                    style={styles.userPhoto}
                    textStyle={styles.userPhotoInitials}
                    screen="HomeListingScreen"
                    userId={review.user.userID}
                    role="reviewer"
                    diagnostics={false}
                  />
                  <Text style={styles.userName}>{review.user.name}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          )}
         </View>
         {/* Display Price Insights */}
                <View style={styles.priceInsightsContainer}>
                  {priceInsightsLoading && priceInsights.length === 0 ? (
                    <View style={styles.sectionStatus}>
                      <ActivityIndicator size="small" color="#2FA84F" />
                      <Text style={styles.sectionStatusText}>Loading rental price history...</Text>
                    </View>
                  ) : priceInsightsError ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => setSecondaryRevision(value => value + 1)}
                      style={styles.sectionStatus}
                    >
                      <Text style={styles.sectionErrorText}>{priceInsightsError} Tap to retry.</Text>
                    </TouchableOpacity>
                  ) : (
                    <PriceInsightsChart data={priceInsights} askingPrice={listing.price} fairPrice={fairPrice?.available ? fairPrice.fairPrice : null} />
                  )}
                </View>
        </>}
                {/* Owner Details Box */}
                      <View style={styles.ownerBox}>
                        <View style={styles.ownerInfo}>
                          {!listing.isDemo && <ProfileImage
                            uri={listing.ownerPhotoURL}
                            name={listing.ownerName}
                            style={styles.ownerImage}
                            textStyle={styles.ownerImageInitials}
                            screen="HomeListingScreen"
                            userId={listing.ownerId}
                            role="owner"
                            diagnostics={false}
                          />}
                          <Text style={styles.ownerText}>Posted by: {listing.ownerName}</Text>
                        </View>
                      </View>

                      {/* Buttons */}
                        <TouchableOpacity disabled={listing.isDemo} onPress={handleChat} style={styles.messageButton}>
                          <Text style={styles.buttonText1}>{listing.isDemo ? 'Sample listing — enquiries unavailable' : 'Message Owner'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reportButton} onPress={handleReportListing}>
                          <Text style={styles.buttonText2}>Report Listing</Text>
                        </TouchableOpacity>

                {/* Modal for reporting listing */}
                      <Modal
                        transparent={true}
                        visible={modalVisible}
                        animationType="none"
                        onRequestClose={handleCancel}
                      >
                        <View style={styles.modalOverlay}>
                          <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Report Listing?</Text>
                            <Text style={styles.modalMessage}>This will send the listing to the admin for review.</Text>
                            <View style={styles.buttonContainer}>
                              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isReportingListing}>
                                <Text style={styles.buttonTexta}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.confirmButton, isReportingListing && styles.disabledConfirmButton]}
                                onPress={handleConfirm}
                                disabled={isReportingListing}
                              >
                                {isReportingListing ? (
                                  <View style={styles.reportingContent}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.buttonTextb}>Reporting...</Text>
                                  </View>
                                ) : (
                                  <Text style={styles.buttonTextb}>Confirm</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </Modal>
                      <Modal
                        visible={!!listingNotificationMessage}
                        transparent
                        animationType="fade"
                        statusBarTranslucent
                      >
                        <View style={styles.notificationOverlay} pointerEvents="none">
                          <View style={styles.notificationCard}>
                            <View style={styles.notificationIconBox}>
                              <Image source={notificationBellIcon} style={styles.notificationIcon} />
                            </View>
                            <Text style={styles.notificationText}>{listingNotificationMessage}</Text>
                          </View>
                        </View>
                      </Modal>
        
        </View>
      </ScrollView>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <FontAwesome name="chevron-left" size={18} color="#101820" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
  },
  priceInsightsContainer: {
    marginHorizontal: 0,
  },
  box: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionStatus: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F7F8FA',
  },
  sectionStatusText: {
    marginTop: 8,
    color: '#4D5651',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionErrorText: {
    color: '#7D251D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 10,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 1,
    elevation: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
  },
  location: {
    fontSize: 14,
    marginTop: 3,
  },
  price: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
    marginTop: 2,
  },
  type: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  line: {
    borderBottomWidth: 1,
    borderBottomColor: '#dcdcdc',
    marginVertical: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  infoBox: {
    alignItems: 'center',
    width: '24%',
  },
  infoText: {
    fontSize: 12,
    marginTop: 4,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  description: {
    fontSize: 14,
    marginBottom: 5,
  },
  listingId: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  schoolsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  toggleText: {
    fontSize: 14,
    color: '#222222',
  },
  selectedToggleText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  map: {
    width: '100%',
    height: 200,
    marginVertical: 10,
  },
  placeName: {
    fontSize: 14,
    marginVertical: 5,
  },
  noPlaces: {
    fontSize: 14,
    color: '#7f8c8d',
    marginVertical: 10,
  },
placesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  placeBox: {
      backgroundColor: 'white',
      borderColor: 'black',
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      margin: 5,
      width: '46%', // Two boxes per row
      maxHeight: 60, // Set a maximum height for the box
      overflow: 'hidden', // Ensure overflow is hidden
  },

  placeName: {
    fontSize: 14,
  },
  noPlaces: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  reviewsContainer: {
      marginVertical: 10,
      paddingHorizontal: 0,
    },
    reviewsHeader: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    scrollContainer: {
      flexDirection: 'row',
    },
    reviewBox: {
      backgroundColor: '#fff',
      borderColor: '#dcdcdc',
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      marginRight: 10,
      width: 250, // Adjust width as needed
      flexDirection: 'column', // Stack items vertically
      justifyContent: 'space-between', // Push user info to the bottom
    },
    starsContainer: {
      flexDirection: 'row',
      marginBottom: 5,
    },
    reviewTitle: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    reviewText: {
      fontSize: 14,
      marginVertical: 5,
      flexGrow: 1, // Allows text to expand
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userPhoto: {
      width: 30,
      height: 30,
      borderRadius: 15,
      marginRight: 5,
    },
    userPhotoInitials: {
      fontSize: 11,
    },
    userName: {
      fontSize: 14,
      color: '#555',
    },
    noReviewsContainer: {
      borderWidth: 1,
      borderColor: '#dcdcdc',
      borderRadius: 5,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    noReviewsText: {
      fontSize: 14,
      color: '#777',
      fontWeight: '600',
    },
container: {
    padding: 15,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reviewContainer: {
    marginBottom:10,
    padding: 0,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  reviewText: {
    fontSize: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 5,
    paddingHorizontal: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',

  },
  cellHeader: {
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'gray', // Header background color changed to black
    flex: 1,
    textAlign: 'center',
    padding: 10,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
  },
ownerBox: {
    borderWidth: 1,
    borderColor: '#000', // Black outline
    backgroundColor: '#fff', // White background
    padding: 10,
    marginTop: 20,
    borderRadius: 10,

  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  ownerImageInitials: {
    fontSize: 18,
  },
  ownerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  messageButton: {
      marginTop: 10,
      marginBottom: 10,
    backgroundColor: '#000', // Black background
    padding: 10,
    borderRadius: 5,
    flex: 1,
    borderWidth: 1,
  },
  reportButton: {
      marginBottom: 10,
    backgroundColor: '#fff', // White background
    padding: 10,
    borderRadius: 5,
    flex: 1,
    borderWidth: 1,
    borderColor: '#000', // Black outline
  },
  buttonText1: {
    color: '#ffffff', // Button text color
    textAlign: 'center',
    fontWeight: 'bold',

  },
  buttonText2: {
      color: '#000000', // Button text color
      textAlign: 'center',
      fontWeight: 'bold',

    },
 modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Position modal at the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimming effect
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
      alignItems: 'left',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalMessage: {
      alignItems: 'left',
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    marginRight: 5,
    borderColor:'black',
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 5,
    marginLeft: 5,
    borderColor:'black',
    borderWidth: 1,
  },
  disabledConfirmButton: {
    opacity: 0.82,
  },
  reportingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonTexta: {
    textAlign: 'center',
    color: 'black',
  },
  buttonTextb: {
      textAlign: 'center',
      color: 'white',
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

export default HomeListingScreen;
