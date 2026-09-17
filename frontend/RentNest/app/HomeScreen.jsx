import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationBar from '../components/NavigationBar'; // Import the NavigationBar component
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const HomeScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [listings, setListings] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTypes, setSelectedTypes] = useState(['HDB', 'Condo', 'Landed']);
  const [filterButtonActive, setFilterButtonActive] = useState(false);

  const router = useRouter();

  const fetchListings = async () => {
    try {
      setIsLoading(true);

      // Get the token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
       if (!token) {
         console.log('No token found!');
         router.replace('/LoginScreen');
         return;
       }

      const response = await axios.get(`${API_BASE_URL}${ENDPOINTS.LISTINGS}`,{
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log("Listings fetched!");

      const transformedListings = response.data.map(listing => ({
        listingId: listing.listingID,
        name: listing.name,
        address: listing.location,
        price: listing.price,
        rating: 4.0,
        image: listing.listingpicture ||'https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_676,w_1200/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG',
        pincode: listing.postal,
        type: listing.type,
        description: listing.description,
        beds: listing.beds,
        baths: listing.bathroom,
        size: listing.size,
        floor: listing.floor,
        unitNumber: listing.unitNumber,
        ownerId: listing.ownerId,
        ownerName: listing.ownerName
      }));

      console.log("Transformed listings!");
      setListings(transformedListings);
      
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert(
        'Error',
        'Failed to load listings. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // useEffect(() => {
  //   const exampleListings = [
  //     {
  //       listingId: 1,
  //       name: 'Luxury Condo',
  //       address: '123 Main St, City, Country',
  //       price: 1500,
  //       rating: 4.5,
  //       image: 'https://sgluxuryhomes.com.sg/wp-content/uploads/private-house.jpeg.webp',
  //       pincode: 123456,
  //       type: 'Condo',
  //       rentalType: 'Apartment Rental',
  //     },
  //     {
  //       listingId: 2,
  //       name: 'Cozy HDB',
  //       address: '456 Another Rd, City, Country',
  //       price: 800,
  //       rating: 4.0,
  //       image: 'https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_676,w_1200/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG',
  //       pincode: 234567,
  //       type: 'HDB',
  //       rentalType: 'Room Rental',
  //     },
  //     {
  //       listingId: 3,
  //       name: 'Modern Apartment',
  //       address: '789 Some Blvd, City, Country',
  //       price: 1200,
  //       rating: 4.8,
  //       image: 'https://zenitharc.com.sg/wp-content/uploads/2024/01/best-hdb-renovation-in-singapore-1.jpg',
  //       pincode: 345678,
  //       type: 'Condo',
  //       rentalType: 'Apartment Rental',
  //     },
  //   ];

  //   setListings(exampleListings);
  // }, []);

  const filteredListings = listings.filter(listing => {
    const isSearchValid =
      listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.pincode.toString().includes(searchTerm);

    const isTypeValid = selectedTypes.includes(listing.type);

    return isSearchValid && isTypeValid;
  });

  const renderListing = ({ item }) => {
    if (!item) return null;

    return (
       <TouchableOpacity
              style={styles.listingContainer}
              onPress={() =>
                router.push({
                  pathname: '/HomeListingScreen',
                  params: { listingId: item.listingId }, // Pass listingId as params
                })
              }
          >
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.infoContainer}>
          <View style={styles.detailsContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.apartmentName}>{item.name}</Text>
              <Text style={styles.address}>{item.address}</Text>
              <Text style={styles.price}>${item.price}/month</Text>
            </View>
            {/* <Text style={styles.rating}>★ {item.rating}</Text> */}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };


  const toggleFilterButton = () => {
    setFilterButtonActive(prev => !prev);
    setShowFilters(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={() => {
              setIsSearchFocused(true);
              setShowFilters(false);
            }}
            onBlur={() => setIsSearchFocused(false)}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={toggleFilterButton}
          >
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterContainer}>
            <View style={styles.buttonContainer}>
              {['HDB', 'Condo', 'Landed'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, selectedTypes.includes(type) ? styles.selectedButton : styles.unselectedButton]}
                  onPress={() => toggleType(type)}
                >
                  <Text style={styles.buttonText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      <FlatList
        data={filteredListings}
        renderItem={renderListing}
        keyExtractor={item => item.listingId.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View style={styles.listHeaderSpacing} />}
      />

      <NavigationBar style={styles.navigationBar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    flex: 1,
  },
  filterButton: {
    position: 'absolute',
    right: 15,
    top: 9,
    padding: 7,
    backgroundColor: 'black',
    borderRadius: 10,
  },
  filterButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: 5,
    borderRadius: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 8,
    borderRadius: 20,
    margin: 3,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'black',
  },
  selectedButton: {
    borderColor: 'black',
  },
  unselectedButton: {
    borderColor: 'transparent',
  },
  buttonText: {
    color: 'black',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  listingContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  infoContainer: {
    padding: 10,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apartmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 24,
  },
  address: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
  },
  rating: {
    fontSize: 14,
    color: '#222222',
  },
  list: {
    paddingBottom: 70, // Adjust this based on the height of your navigation bar
  },
  navigationBar: {
    position: 'absolute', // Set position to absolute
    bottom: 0, // Align it to the bottom of the screen
    left: 0,
    right: 0,
  },
});

export default HomeScreen;
