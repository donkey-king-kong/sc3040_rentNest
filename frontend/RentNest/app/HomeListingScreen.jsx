// Previous imports remain unchanged
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Modal, ActivityIndicator} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import MapView, { Marker } from '../components/AppMap';
import {useRouter, useLocalSearchParams} from "expo-router";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { jwtDecode } from 'jwt-decode';
import MorphingInfinity from '../components/MorphingInfinity';

const notificationBellIcon = require('../assets/images/notificationBell.png');

const HomeListingScreen = () => {
  console.log('Initializing HomeListingScreen component');

  const router = useRouter();
  const { listingId } = useLocalSearchParams();

  const [listing, setListing] = useState(null);
  const [nearbySchools, setNearbySchools] = useState([]);
  const [nearbyHawkerCentres, setNearbyHawkerCentres] = useState([]);
  const [nearbyBusStops, setNearbyBusStops] = useState([]);
  const [priceInsights, setPriceInsights] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Schools');
  const [loading, setLoading] = useState(true);
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
    const fetchListingData = async () => {
      try {
        const tokenValue = await AsyncStorage.getItem('token');
        
        if (!tokenValue) {
          router.replace('/LoginScreen');
          return;
        }

        setToken(tokenValue);
        // const decodeToken = tokenValue;

        // Fetch currentUser details
        const decoded = jwtDecode(tokenValue);
        const userEmail = decoded.sub;

        const response = await axios.get(`${API_BASE_URL}/api/users/${userEmail}`, {
          headers: authHeaders(tokenValue)
        });

        setCurrentUserID(response.data.userID);

        // Fetch listing details
        console.log('Making listing API request...');
        const listingResponse = await axios.get(`${API_BASE_URL}/api/listings/${listingId}`, {
          headers: authHeaders(tokenValue)
        });
        console.log('Listing API response:', listingResponse.data);

        // Apply default values only if the response data is empty or missing properties
        const listingData = listingResponse.data || {};
        const defaultListing = {
          name: listingData.name || 'No Name Available',
          location: listingData.location || 'Location not available',
          price: listingData.price || 0,
          rating: 4.0,
          pincode: listingData.postal || 489836,
          type: listingData.type || 'Not specified',
          rentalType: 'Room Rental',
          description: listingData.description || 'No description available',
          beds: listingData.beds || 0,
          baths: listingData.bathroom || 0,
          size: listingData.size || 1, // Prevent division by zero
          imageURL: listingData.listingpicture || 'https://www.sgluxurycondo.com/wp-content/uploads/2022/11/should-you-buy-a-luxury-condo-buyers-guide-to-luxury-condo-in-singapore-1536x1024.jpg',
          ownerUserID: listingData.ownerId || '',
          ownerName: listingData.ownerName || 'Unknown',
          ownerPhotoURL: listingData.ownerPhotoURL || 'https://thumbs.dreamstime.com/b/tranquil-caucasian-handsome-brunet-man-blue-long-scarf-posing-wrinkled-face-against-background-square-image-236510369.jpg'
        };
        console.log('Processed listing data:', defaultListing);
        setListing(defaultListing);

        // Show the listing once core details are ready; secondary sections load in the background.
        setLoading(false);
        fetchSecondaryListingData(tokenValue, defaultListing.ownerUserID)
          .catch(error => {
            console.warn('Secondary listing data failed:', error?.message);
          });
      } catch (error) {
        console.error('Error in fetchListingData:', error);
        console.error('Error details:', { //Remove when demo
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      } finally {
        console.log('Fetch operation completed, setting loading to false');
        setLoading(false);
      }
    };

    const fetchSecondaryListingData = async (tokenValue, ownerUserID) => {
      const headers = authHeaders(tokenValue);
      const requestConfig = { headers, timeout: 20000 };
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const applyNearbyAmenities = (amenities) => {
        setNearbySchools(amenities
          .filter(item => item.amenity_type === 'school')
          .map(item => ({
            schoolName: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            distanceMeters: item.distance_meters
          })));
        setNearbyHawkerCentres(amenities
          .filter(item => item.amenity_type === 'hawker_centre')
          .map(item => ({
            nameOfCentre: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            distanceMeters: item.distance_meters
          })));
        setNearbyBusStops(amenities
          .filter(item => item.amenity_type === 'bus_stop')
          .map(item => ({
            description: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            distanceMeters: item.distance_meters
          })));
      };

      const fetchNearbyAmenitiesUntilReady = async () => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const response = await axios.get(`${API_BASE_URL}/api/gov/nearby-amenities/${listingId}`, requestConfig);
          const payload = response.data || {};
          const amenities = Array.isArray(payload) ? payload : (payload.amenities || []);
          const status = Array.isArray(payload) ? 'READY' : payload.status;

          if (status === 'READY' || amenities.length > 0) {
            applyNearbyAmenities(amenities);
            return;
          }

          if (status !== 'LOADING') {
            console.log('Nearby amenities unavailable:', status);
            applyNearbyAmenities([]);
            return;
          }

          await wait(2000);
        }

        console.log('Nearby amenities are still loading after timeout; showing empty state');
        applyNearbyAmenities([]);
      };

      await Promise.allSettled([
        fetchNearbyAmenitiesUntilReady(),
        axios.get(`${API_BASE_URL}/api/gov/rentalprices/${listingId}`, requestConfig)
          .then(response => {
            const uniquePrices = {};
            (response.data || []).forEach(item => {
              if (!uniquePrices[item.leaseDate] || item.rentPrice > uniquePrices[item.leaseDate].rentPrice) {
                uniquePrices[item.leaseDate] = item;
              }
            });
            setPriceInsights(Object.values(uniquePrices));
          }),
        axios.get(`${API_BASE_URL}/api/reviews/byUser/${ownerUserID}`, requestConfig)
          .then(response => {
            const reviewList = Array.isArray(response.data) ? response.data : [];
            const formattedReviews = reviewList.map(review => ({
              reviewId: review.reviewID ?? review.reviewid ?? review.id,
              rating: review.rating,
              title: review.title || 'Review',
              text: review.text,
              user: {
                userID: review.reviewerID ?? review.reviewerId ?? review.userId,
                name: review.reviewerName || review.userName || 'Anonymous',
                photoURL: review.reviewerPhotoURL || review.userPhotoURL || 'https://via.placeholder.com/50'
              },
              flagged: review.flagged || false
            }));
            setReviews(formattedReviews);
          })
      ]).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const status = result.reason?.response?.status;
            if (status !== 404) {
              console.warn(`Secondary listing request ${index} failed:`, result.reason?.message);
            }
          }
        });
      });
    };

    fetchListingData();
  }, [authHeaders, listingId, router]);

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
    router.push(`/ChatsScreen2?partnerUserId=${listing.ownerUserID}&currentUser=${currentUserID}`);
  };

  // Memoize the price per square foot calculation
  const pricePerSqft = useMemo(() => 
    listing ? (listing.price / listing.size).toFixed(2) : '0.00',
    [listing]
  );

  // Memoize the nearby places data
  const { data } = useMemo(() => getNearbyPlaces(), [getNearbyPlaces]);

  if (loading || !listing) {
    return (
      <View style={styles.loadingScreen}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  console.log('Rendering main component');

  return (
    <ScrollView style={styles.box}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: listing.imageURL }} style={styles.image} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {/* Display the name and address */}
        <Text style={styles.name}>{listing.name}</Text>
        <Text style={styles.location}>{listing.location}</Text>

        {/* Display the price */}
        <Text style={styles.price}>${listing.price}/month</Text>

        {/* Display the apartment type */}
        <Text style={styles.type}>Apartment Type: {listing.type}</Text>

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
        <MapView
          style={styles.map}
          region={mapRegion} // Update to use the mapRegion state
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
             ) : (
                 <Text style={styles.noPlaces}>No places nearby.</Text>
              )}
          </View>

      <View style={styles.reviewsContainer}>
        <Text style={styles.reviewsHeader}>Reviews</Text>
          {reviews.length > 0 ? (
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
                  <Image source={{ uri: review.user.photoURL }} style={styles.userPhoto} />
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
                <Text style={styles.header1}>Price Insights</Text>
                <View style={styles.table}>
                    <View style={styles.row}>
                        <Text style={styles.cellHeader}>Lease Date</Text>
                        <Text style={styles.cellHeader}>Rent Price</Text>
                    </View>
                    {priceInsights.map((item) => (
                      <View key={item.leaseDate} style={styles.row}>
                        <Text style={styles.cell}>{item.leaseDate}</Text>
                        <Text style={styles.cell}>${item.rentPrice}</Text>
                      </View>
                    ))}
                </View>
                {/* Owner Details Box */}
                      <View style={styles.ownerBox}>
                        <View style={styles.ownerInfo}>
                          <Image source={{ uri: listing.ownerPhotoURL }} style={styles.ownerImage} />
                          <Text style={styles.ownerText}>Posted by: {listing.ownerName}</Text>
                        </View>
                      </View>

                      {/* Buttons */}
                        <TouchableOpacity onPress={handleChat} style={styles.messageButton}>
                          <Text style={styles.buttonText1}>Message Owner</Text>
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
  );
};

const styles = StyleSheet.create({
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
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
  header1: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      paddingHorizontal: 20
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
