import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/button';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    // Validation
    if (!email) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Validation Error', 'Email format is invalid.');
      return;
    }
    if (!password) {
      Alert.alert('Validation Error', 'Password is required.');
      return;
    }

    try {
      console.log('Attempting login for:', email); // Debug log
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
        email: email,
        password: password
      });
  
      console.log('Response received:', response.status); // Debug log
  
      // Check if we have the expected data
      if (!response.data || !response.data.token) {
        throw new Error('Invalid response format');
      }
  
      try {
        await AsyncStorage.setItem('token', response.data.token);
        // Only set userId if it exists in the response
        if (response.data.userId) {
          await AsyncStorage.setItem('userId', response.data.userId.toString());
        }
  
        // Configure axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
  
        // Special case for admin
        if (email === 'admin@gmail.com') {
          router.push('/AdminScreen');
          return;
        }
  
        router.push('/HomeScreen');
      } catch (storageError) {
        console.log('Storage error:', storageError);
        Alert.alert('Error', 'Failed to save login information');
      }
    } catch (error) {
      console.log('Login error:', error); // Debug log
      if (error.response) {
        // The server responded with an error
        const errorMessage = error.response.data?.message || 'Invalid credentials';
        Alert.alert('Login Failed', errorMessage);
      } else if (error.request) {
        // The request was made but no response received
        console.log('No response received:', error.request);
        Alert.alert(
          'Network Error',
          'Could not connect to the server. Please check your connection.'
        );
      } else {
        // Something happened in setting up the request
        console.log('Request setup error:', error.message);
        Alert.alert(
          'Connection Error',
          'Could not connect to the server. Please try again.'
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

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

      <View style={styles.buttonContainer}>
        <Button
          title="Login"
          onPress={handleLogin}
          backgroundColor="#222222"
          textColor="#FFFFFF"
          fontSize={18}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20, // Reduced margin to bring the fields closer
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 'auto', // Moves the button to the bottom
    width: '110%',
  },
});

export default LoginScreen;
