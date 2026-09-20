import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/button';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const LoginScreen = () => {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (pending.current) return;
    setError('');
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError('Enter a valid email address.');
    if (!password) return setError('Password is required.');
    pending.current = true;
    setSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
        email: cleanEmail, password,
      }, { timeout: 15000 });
      if (!response.data?.token) throw new Error('The server did not return a login token.');
      await AsyncStorage.setItem('token', response.data.token);
      if (response.data.userId) await AsyncStorage.setItem('userId', String(response.data.userId));
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      router.replace(cleanEmail === 'admin@gmail.com' ? '/AdminScreen' : '/HomeScreen');
    } catch (failure) {
      const data = failure.response?.data;
      const message = typeof data === 'string' ? data : data?.message;
      setError(typeof message === 'string' && message ? message
        : failure.isAxiosError ? 'Could not log in. Check your connection and try again.'
        : 'Could not complete login. Please try again.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      {params.registered === '1' ? <Text style={{ color: '#205c43', marginBottom: 16 }}>Account created successfully. Log in with the password you just chose.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: '#a42020', marginBottom: 16 }}>{error}</Text> : null}
      <TouchableOpacity onPress={() => router.push('/SignUpScreen')}>
        <Text style={{ color: '#205c43', marginBottom: 20 }}>Need an account? Sign up</Text>
      </TouchableOpacity>

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
          title={submitting ? 'Logging in…' : 'Login'}
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
    width: '100%',
  },
});

export default LoginScreen;
