import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/button';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
      <View>
        <Text style={styles.title}>Login to your account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(text) => setEmail(text)}
          value={email}
        />

        <View style={styles.passwordLabelRow}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity onPress={() => router.push('/ForgotPasswordScreen')}>
            <Text style={styles.forgotPasswordText}>Forgot?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry={!isPasswordVisible}
            onChangeText={(text) => setPassword(text)}
            value={password}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <FontAwesome
              name={isPasswordVisible ? 'eye-slash' : 'eye'}
              size={22}
              color="#777"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.buttonContainer}>
          <Button
            title="Login now"
            onPress={handleLogin}
            backgroundColor="#222222"
            textColor="#FFFFFF"
            fontSize={18}
          />
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/SignUpScreen')}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 48,
    marginBottom: 34,
  },
  label: {
    color: '#555',
    fontSize: 18,
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotPasswordText: {
    color: '#0A84FF',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 22,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 15,
    paddingRight: 50,
    fontSize: 16,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#999',
    fontSize: 16,
    marginRight: 8,
  },
  signupLink: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
