import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Button from '../components/button';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const SignUpScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);

  const handleSignUp = async () => {
    if (pending.current) return;
    setError('');
    const cleanEmail = email.trim();
    if (!fullName.trim()) return setError('Full name is required.');
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters long.');
    if (!/^\d{8,}$/.test(phoneNumber.trim())) return setError('Phone number must contain at least 8 digits.');
    pending.current = true;
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}${ENDPOINTS.SIGNUP}`, {
        email: cleanEmail, password, fullName: fullName.trim(), contact: phoneNumber.trim(),
      }, { timeout: 15000 });
      router.replace({ pathname: '/LoginScreen', params: { email: cleanEmail, registered: '1' } });
    } catch (failure) {
      const data = failure.response?.data;
      const message = typeof data === 'string' ? data : data?.message;
      setError(message === 'Email already exists'
        ? 'This email is already registered. Log in with your existing password, or use a different email to create an account.'
        : typeof message === 'string' ? message : 'Could not create your account. Check your connection and try again.');
    } finally {
      pending.current = false;
      setSubmitting(false);
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
        {error ? <Text accessibilityRole="alert" style={{ color: '#a42020', marginBottom: 16 }}>{error}</Text> : null}
        <TouchableOpacity onPress={() => router.push({ pathname: '/LoginScreen', params: { email: email.trim() } })}>
          <Text style={{ color: '#205c43', marginBottom: 20 }}>Already have an account? Log in</Text>
        </TouchableOpacity>

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
          title={submitting ? 'Creating account…' : 'Sign Up'}
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
