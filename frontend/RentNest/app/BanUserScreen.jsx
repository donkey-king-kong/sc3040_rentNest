import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';
import MorphingInfinity from '../components/MorphingInfinity';

const BanUsersScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [flaggedUsersData, setFlaggedUsersData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { refresh } = useLocalSearchParams();

  const getFlaggedUsers = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/users/admin/flagged`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log(response.data)
      const transformedData = response.data.map(user => ({
        userid: user.userID,
        name: user.name,
        email: user.email,
        flagged: user.flagged,
        photoURL: user.photoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg" // Default photo if none provided
      }));
      console.log(transformedData)

      setFlaggedUsersData(transformedData);
    } catch (error) {
      console.error("An error occurred:", error);
      setFlaggedUsersData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await getFlaggedUsers();
    setRefreshing(false);
  }, []);

  // Search function to filter flagged users by name
  const filterUsers = (users, query) => {
    if (!query) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  useEffect(() => {
    getFlaggedUsers();
  }, []);

  // Effect to handle refresh parameter
  useEffect(() => {
    if (refresh === 'true') {
      getFlaggedUsers();
    }
  }, [refresh]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading flagged users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/AdminScreen')}>
          <FontAwesome name="chevron-left" size={18} color="#101820" />
        </TouchableOpacity>
        <Text style={styles.header}>Ban Flagged Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by user name..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* FlatList for flagged users */}
      <FlatList
        data={filterUsers(flaggedUsersData, searchQuery)}
        keyExtractor={item => item.userID}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.userBox}>
            {/* User Image */}
            <Image source={{ uri: item.photoURL }} style={styles.userImage} />
            {/* User Name */}
            <Text style={styles.userName}>{item.name}</Text>
            {/* Review Button */}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push(`/BanUserScreen2?userid=${item.userid}`)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerSpacer: {
    width: 42,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: '#000', // Add text color
  },
  userBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 15,
    marginRight: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  reviewButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default BanUsersScreen;
