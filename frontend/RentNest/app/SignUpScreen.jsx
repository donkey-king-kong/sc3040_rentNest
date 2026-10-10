import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';

const errorIcon = require('../assets/images/errorIcon.png');

const SignUpScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const fullNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  const router = useRouter();

  const handleSignUp = async () => {
    if (pending.current) return;
    setFormError('');
    setFieldErrors({});

    const cleanEmail = email.trim();
    const missingFields = [];
    const nextFieldErrors = {};

    if (!fullName.trim()) {
      missingFields.push('full name');
      nextFieldErrors.fullName = true;
    }
    if (!cleanEmail) {
      missingFields.push('email');
      nextFieldErrors.email = true;
    }
    if (!password) {
      missingFields.push('password');
      nextFieldErrors.password = true;
    }
    if (!phoneNumber.trim()) {
      missingFields.push('phone number');
      nextFieldErrors.phoneNumber = true;
    }
    if (missingFields.length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError(`ERROR: Please fill in ${missingFields.join(', ')}.`);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setFieldErrors({ email: true });
      setFormError('ERROR: Email format is invalid.');
      return;
    }
    if (password.length < 6) {
      setFieldErrors({ password: true });
      setFormError('ERROR: Password must be at least 6 characters long.');
      return;
    }
    if (!/^\d{8,}$/.test(phoneNumber.trim())) {
      setFieldErrors({ phoneNumber: true });
      setFormError('ERROR: Phone number must contain at least 8 digits.');
      return;
    }

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
      if (message === 'Email already exists') {
        setFieldErrors({ email: true });
        setFormError('ERROR: This email is already registered. Log in instead, or use a different email.');
      } else if (failure.response) {
        setFormError(`ERROR: ${typeof message === 'string' && message ? message : 'Could not create account.'}`);
      } else if (failure.request) {
        setFormError('ERROR: No response from server. Please check your connection.');
      } else {
        setFormError('ERROR: Failed to connect to the server. Please try again.');
      }
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

        <Pressable
          style={[styles.inputContainer, fieldErrors.fullName && styles.errorInputContainer]}
          onPress={() => fullNameInputRef.current?.focus()}
        >
          <FontAwesome name="user" size={20} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={fullNameInputRef}
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#666"
            onChangeText={(text) => {
              setFullName(text);
              setFieldErrors((previousErrors) => ({ ...previousErrors, fullName: false }));
              setFormError('');
            }}
            value={fullName}
          />
        </Pressable>

        <Pressable
          style={[styles.inputContainer, fieldErrors.email && styles.errorInputContainer]}
          onPress={() => emailInputRef.current?.focus()}
        >
          <FontAwesome name="envelope" size={18} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={emailInputRef}
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(text) => {
              setEmail(text);
              setFieldErrors((previousErrors) => ({ ...previousErrors, email: false }));
              setFormError('');
            }}
            value={email}
          />
        </Pressable>

        <Pressable
          style={[styles.inputContainer, fieldErrors.password && styles.errorInputContainer]}
          onPress={() => passwordInputRef.current?.focus()}
        >
          <FontAwesome name="lock" size={22} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry={!isPasswordVisible}
            onChangeText={(text) => {
              setPassword(text);
              setFieldErrors((previousErrors) => ({ ...previousErrors, password: false }));
              setFormError('');
            }}
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

        <Pressable
          style={[styles.inputContainer, fieldErrors.phoneNumber && styles.errorInputContainer]}
          onPress={() => phoneInputRef.current?.focus()}
        >
          <FontAwesome name="phone" size={22} color="#777" style={styles.inputIcon} />
          <TextInput
            ref={phoneInputRef}
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            onChangeText={(text) => {
              setPhoneNumber(text);
              setFieldErrors((previousErrors) => ({ ...previousErrors, phoneNumber: false }));
              setFormError('');
            }}
            value={phoneNumber}
          />
        </Pressable>

        {formError ? (
          <View style={styles.errorMessageContainer}>
            <Image source={errorIcon} style={styles.errorIcon} />
            <Text style={styles.errorMessageText}>{formError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Creating account…' : 'Sign Up'}</Text>
        </TouchableOpacity>

        <View style={styles.signinContainer}>
          <Text style={styles.signinText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/LoginScreen', params: { email: email.trim() } })}>
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
  errorInputContainer: {
    borderWidth: 1,
    borderColor: '#E94068',
    backgroundColor: '#FFF1F4',
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
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  errorMessageText: {
    color: '#E94068',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
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
