import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from 'react-native-vector-icons'; // Import FontAwesome icons
import NavigationBar from '../components/NavigationBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState({
    userID: 1,
    name: 'Loading...',
    email: 'Loading...',
    contact: 'Loading...',
    photoURL: 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          navigation.navigate('LandingScreen');
          return;
        }

        const decoded = jwtDecode(token);
        const userEmail = decoded.sub;

        const response = await axios.get(`${API_BASE_URL}/api/users/${userEmail}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        setUser({
          userID: response.data.userID,
          name: response.data.name,
          email: response.data.email,
          contact: response.data.contact,
          photoURL: response.data.photoURL || 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg'
        });

      } catch (error) {
        console.error('Error fetching user data:', error);
        navigation.navigate('LandingScreen');
      }
    };

    fetchUserData();
  }, []);

  // Function to navigate to EditProfileScreen
  const handleEditProfile = () => {
    navigation.navigate('EditProfileScreen');
  };

  // Function to navigate to LandingScreen
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      navigation.navigate('LandingScreen');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.profileBox}>
          <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
          <View style={styles.infoContainer}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.contact}>{user.contact}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleEditProfile}>
          <FontAwesome name="edit" size={20} color="black" style={styles.icon} />
          <Text style={styles.buttonText}>Edit Profile</Text>
          <Text style={styles.arrow}> &gt;</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={20} color="black" style={styles.icon} />
          <Text style={styles.buttonText}>Logout</Text>
          <Text style={styles.arrow}> &gt;</Text>
        </TouchableOpacity>
      </View>

      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  contact: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: 'black',
  },
  icon: {
    marginRight: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
});

export default ProfileScreen;
