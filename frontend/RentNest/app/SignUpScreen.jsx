import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Button from '../components/button';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const SignUpScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const router = useRouter();

  const handleSignUp = async () => {
    // Validation
    if (!fullName) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!email) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Validation Error', 'Email format is invalid.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 8) {
     Alert.alert('Validation Error', 'Phone Number must be at least 8 digits long.');
     return;
     }

    try {
      console.log("Attempting signup with:", { email, fullName });
      // First API call
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.SIGNUP}`, {
        email,
        password,
        fullName
      });

      console.log("Response received:", response.status);
  
      // If we get here, the signup was successful
      Alert.alert(
        'Success',
        'Account created successfully!'
      );

      router.push('/LandingScreen');

    } catch (error) {
      console.error('Detailed signup error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
  
      if (error.response) {
        // Server responded with an error
        const errorMessage = error.response.data?.message || error.response.data || 'Could not create account';
        Alert.alert('Registration Failed', errorMessage);
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        Alert.alert(
          'Network Error',
          'No response from server. Please check your connection.'
        );
      } else {
        // Error in setting up the request
        console.error('Request setup error:', error.message);
        Alert.alert(
          'Connection Error',
          'Failed to connect to the server. Please try again.'
        );
      }
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100} // Adjust this value based on your layout
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sign Up</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#999"
          onChangeText={(text) => setFullName(text)}
          value={fullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(text) => setEmail(text)}
          value={email}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          onChangeText={(text) => setPassword(text)}
          value={password}
        />

        <TextInput
            style={styles.phoneInput}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            onChangeText={(text) => setPhoneNumber(text)}
            value={phoneNumber}
                  />

        {/* <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          onChangeText={(text) => setOtp(text)}
          value={otp}
        />
      </ScrollView> */}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Sign Up"
          onPress={handleSignUp}
          backgroundColor="#222222"
          textColor="#FFFFFF"
          fontSize={18}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingBottom: 100, // Added extra padding for bottom space
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20, // Space between title and input fields
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10, // Space between input fields
    fontSize: 16,
  },
  phoneContainer: {
    position: 'relative', // To allow absolute positioning of the button
    marginBottom: 10,
  },
  phoneInput: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    width: '100%', // Full width for the input
  },
  otpButton: {
    position: 'absolute', // Position the button inside the input
    right: 10, // Positioning from the right end
    top: 10, // Align with the top of the input
    backgroundColor: '#222222', // Button color
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  otpButtonText: {
    color: '#FFFFFF', // Text color
    fontWeight: 'bold',
    fontSize: 12, // Smaller font size
  },
  buttonContainer: {
    paddingBottom: 20, // Space for the button at the bottom
    marginHorizontal: 20, // Add left and right margin
    width: '98%'
  },
});

export default SignUpScreen;
