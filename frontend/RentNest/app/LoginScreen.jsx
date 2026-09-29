import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
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
      <View style={styles.formContainer}>
        <Text style={styles.title}>Login to your account</Text>

        <Pressable style={styles.inputContainer} onPress={() => emailInputRef.current?.focus()}>
          <FontAwesome name="envelope" size={18} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={emailInputRef}
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(text) => setEmail(text)}
            value={email}
          />
        </Pressable>

        <Pressable style={styles.inputContainer} onPress={() => passwordInputRef.current?.focus()}>
          <FontAwesome name="lock" size={22} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#666"
            secureTextEntry={!isPasswordVisible}
            onChangeText={(text) => setPassword(text)}
            value={password}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            disabled={!password}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <FontAwesome
              name={isPasswordVisible ? 'eye' : 'eye-slash'}
              size={22}
              color={password ? '#777' : '#C4C4C4'}
            />
          </TouchableOpacity>
        </Pressable>

        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={() => router.push('/ForgotPasswordScreen')}
        >
          <Text style={styles.forgotPasswordText}>Forgot?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Login now</Text>
        </TouchableOpacity>

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
    paddingHorizontal: 22,
    paddingTop: 44,
    backgroundColor: '#F7F8FA',
  },
  formContainer: {
    marginTop: 120,
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#101820',
    textAlign: 'center',
    marginBottom: 58,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  inputIcon: {
    width: 28,
    marginRight: 14,
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    outlineStyle: 'none',
  },
  passwordToggle: {
    paddingLeft: 12,
    paddingVertical: 12,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 34,
  },
  primaryButton: {
    height: 72,
    borderRadius: 36,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
