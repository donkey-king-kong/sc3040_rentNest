import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Validation Error', 'Email format is invalid.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE_URL}${ENDPOINTS.RESET_PASSWORD}`, {
        email,
        newPassword,
      });

      Alert.alert(
        'Password Updated',
        'You can now log in with your new password.',
        [{ text: 'OK', onPress: () => router.push('/LoginScreen') }]
      );
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data?.message || error.response.data || 'Unable to reset password.';
        Alert.alert('Reset Failed', errorMessage);
      } else {
        Alert.alert('Network Error', 'Could not connect to the server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color="#111" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and choose a new password to regain access to your account.
        </Text>

        <View style={styles.inputContainer}>
          <FontAwesome name="envelope" size={18} color="#777" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(text) => setEmail(text)}
            value={email}
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={22} color="#777" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="#666"
            secureTextEntry={!isPasswordVisible}
            onChangeText={(text) => setNewPassword(text)}
            value={newPassword}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <FontAwesome
              name={isPasswordVisible ? 'eye-slash' : 'eye'}
              size={20}
              color="#777"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isSubmitting && styles.disabledButton]}
          onPress={handleResetPassword}
          disabled={isSubmitting}
        >
          <Text style={styles.continueButtonText}>
            {isSubmitting ? 'Updating...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 22,
    paddingTop: 44,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 70,
  },
  title: {
    color: '#101820',
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    color: '#555',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 58,
    paddingHorizontal: 18,
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
  },
  passwordToggle: {
    paddingLeft: 12,
    paddingVertical: 12,
  },
  continueButton: {
    height: 72,
    borderRadius: 36,
    backgroundColor: '#35BF7D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#35BF7D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.65,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
