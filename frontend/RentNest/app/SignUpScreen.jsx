import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';

const SignUpScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const fullNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const phoneInputRef = useRef(null);

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

        <Pressable style={styles.inputContainer} onPress={() => fullNameInputRef.current?.focus()}>
          <FontAwesome name="user" size={20} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={fullNameInputRef}
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#666"
            onChangeText={(text) => setFullName(text)}
            value={fullName}
          />
        </Pressable>

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
            placeholder="Password"
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
              size={20}
              color={password ? '#777' : '#C4C4C4'}
            />
          </TouchableOpacity>
        </Pressable>

        <Pressable style={styles.inputContainer} onPress={() => phoneInputRef.current?.focus()}>
          <FontAwesome name="phone" size={22} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={phoneInputRef}
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            onChangeText={(text) => setPhoneNumber(text)}
            value={phoneNumber}
          />
        </Pressable>

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
        <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <View style={styles.signinContainer}>
          <Text style={styles.signinText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/LoginScreen')}>
            <Text style={styles.signinLink}>Sign In here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingBottom: 100, // Added extra padding for bottom space
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
    paddingBottom: 34,
    width: '100%'
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
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signinText: {
    color: '#666',
    fontSize: 16,
    marginRight: 8,
  },
  signinLink: {
    color: '#2DAF7D',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignUpScreen;
