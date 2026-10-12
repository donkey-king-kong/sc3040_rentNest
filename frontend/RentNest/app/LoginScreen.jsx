import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Pressable, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';

const errorIcon = require('../assets/images/errorIcon.png');

const LoginScreen = () => {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (pending.current) return;
    setFormError('');
    setFieldErrors({});

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFieldErrors({ email: true });
      setFormError('ERROR: Email is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setFieldErrors({ email: true });
      setFormError('ERROR: Email format is invalid.');
      return;
    }
    if (!password) {
      setFieldErrors({ password: true });
      setFormError('ERROR: Password is required.');
      return;
    }

    pending.current = true;
    setSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
        email: cleanEmail,
        password,
      }, { timeout: 15000 });

      if (!response.data?.token) {
        throw new Error('Invalid response format');
      }

      await AsyncStorage.setItem('token', response.data.token);
      if (response.data.userId) {
        await AsyncStorage.setItem('userId', String(response.data.userId));
      } else {
        await AsyncStorage.removeItem('userId');
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      router.replace(cleanEmail === 'admin@gmail.com' ? '/AdminScreen' : '/HomeScreen');
    } catch (failure) {
      if (failure.response) {
        setFieldErrors({ email: true, password: true });
        setFormError('ERROR: Invalid email or password.');
      } else if (failure.request) {
        setFormError('ERROR: Could not connect to the server. Please check your connection.');
      } else {
        setFormError('ERROR: Could not connect to the server. Please try again.');
      }
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Login to your account</Text>
        {params.registered === '1' ? (
          <Text style={styles.registeredNotice}>Account created successfully. Log in with the password you just chose.</Text>
        ) : null}

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
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
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
            placeholder="Enter your password"
            placeholderTextColor="#666"
            secureTextEntry={!isPasswordVisible}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
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

        {formError ? (
          <View style={styles.errorMessageContainer}>
            <Image source={errorIcon} style={styles.errorIcon} />
            <Text style={styles.errorMessageText}>{formError}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Logging in…' : 'Login now'}</Text>
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
  registeredNotice: {
    color: '#205c43',
    textAlign: 'center',
    marginBottom: 16,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
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
