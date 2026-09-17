import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const EditProfileScreen = () => {
  const navigation = useNavigation();

  const [user, setUser] = useState({
    userID: null,
    name: '',
    email: '',
    contact: '',
    photoURL: 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg',
  });

  // State for the updated user details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');

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

        const userData = response.data;
        setUser({
          userID: userData.userID,
          name: userData.name,
          email: userData.email,
          contact: userData.contact,
          photoURL: userData.photoURL || 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg'
        });

        // Populate form fields
        setName(userData.name);
        setEmail(userData.email);
        setContact("12345678");

      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
        navigation.navigate('LandingScreen');
      }
    };

    fetchUserData();
  }, []);

  // Function to validate email
  const isEmailValid = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Function to validate phone number
  const isPhoneNumberValid = (contact) => {
    const regex = /^[0-9]{8,}$/; // At least 8 digits
    return regex.test(contact);
  };

  // Function to handle the update
  const handleUpdateDetails = async () => {
    if (!isEmailValid(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!isPhoneNumberValid(contact)) {
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number with at least 8 digits.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('LandingScreen');
        return;
      }

      // Send PUT request to update user data
      await axios.put(
        `${API_BASE_URL}/api/users/id/${user.userID}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&contact=${encodeURIComponent(contact)}`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert(
        "Success",
        "Profile updated successfully",
        [
          { text: "OK", onPress: () => navigation.navigate('ProfileScreen') }
        ]
      );
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 20}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={styles.profileBox}>
              <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
            </View>
            <TextInput
              style={styles.input}
              value={name}
              placeholder="Name"
              placeholderTextColor="#666"
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              value={email}
              placeholder="Email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              value={contact}
              placeholder="Mobile Number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              onChangeText={setContact}
            />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleUpdateDetails}>
              <Text style={styles.buttonText}>Update Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  buttonContainer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  button: {
    backgroundColor: '#000', // Black color
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%', // Full width
  },
  buttonText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
