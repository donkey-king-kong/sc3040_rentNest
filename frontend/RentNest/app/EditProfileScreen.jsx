import { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';
import MorphingInfinity from '../components/MorphingInfinity';
import ProfileImage from '../components/ProfileImage';

const notificationBellIcon = require('../assets/images/notificationBell.png');

const EditProfileScreen = () => {
  const router = useRouter();

  const [user, setUser] = useState({
    userID: null,
    name: '',
    email: '',
    contact: '',
    photoURL: 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg',
  });

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showProfileUpdated, setShowProfileUpdated] = useState(false);
  const nameInputRef = useRef(null);
  const contactInputRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchUserData = async () => {
        try {
          setIsProfileLoading(true);
          setShowProfileUpdated(false);
          setFieldErrors({});

          const token = await AsyncStorage.getItem('token');
          if (!token) {
            router.replace('/LandingScreen');
            return;
          }

          const decoded = jwtDecode(token);
          const userEmail = decoded.sub;

          const response = await axios.get(`${API_BASE_URL}/api/users/${userEmail}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          const userData = response.data;
          if (!isActive) {
            return;
          }

          if (userData.userID) {
            await AsyncStorage.setItem('userId', userData.userID.toString());
          }

          setUser({
            userID: userData.userID,
            name: userData.name,
            email: userData.email,
            contact: userData.contact,
            photoURL: userData.photoURL || 'https://t3.ftcdn.net/jpg/06/33/54/78/360_F_633547842_AugYzexTpMJ9z1YcpTKUBoqBF0CUCk10.jpg'
          });

          setName(userData.name || '');
          setContact(userData.contact || '');

        } catch (error) {
          console.error('Error fetching user data:', error);
          Alert.alert('Error', 'Failed to load user data');
          router.replace('/LandingScreen');
        } finally {
          if (isActive) {
            setIsProfileLoading(false);
          }
        }
      };

      fetchUserData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const isPhoneNumberValid = (contact) => {
    const regex = /^[0-9]{8,}$/;
    return regex.test(contact);
  };

  const handleUpdateDetails = async () => {
    if (isSaving) {
      return;
    }

    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: true });
      Alert.alert("Missing Full Name", "Please enter your full name.");
      return;
    }

    if (!isPhoneNumberValid(contact)) {
      setFieldErrors({ contact: true });
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number with at least 8 digits.");
      return;
    }

    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/LandingScreen');
        return;
      }

      // Send PUT request to update user data
      await axios.put(
        `${API_BASE_URL}/api/users/id/${user.userID}?name=${encodeURIComponent(name.trim())}&email=${encodeURIComponent(user.email)}&contact=${encodeURIComponent(contact.trim())}`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      setShowProfileUpdated(true);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      notificationTimeoutRef.current = setTimeout(() => {
        setShowProfileUpdated(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderLoadingState = () => (
    <View style={styles.loadingStateContainer}>
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {isProfileLoading ? renderLoadingState() : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <FontAwesome name="chevron-left" size={22} color="#101820" />
          </TouchableOpacity>

          <View style={styles.profileBox}>
            <ProfileImage
              uri={user.photoURL}
              name={user.name}
              style={styles.profileImage}
              textStyle={styles.profileImageInitials}
              screen="EditProfileScreen"
              userId={user.userID}
              role="profile"
            />
          </View>

          <Text style={styles.label}>Full Name</Text>
          <Pressable
            style={[styles.inputContainer, fieldErrors.name && styles.errorInputContainer]}
            onPress={() => nameInputRef.current?.focus()}
          >
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              value={name}
              placeholder="Your Name"
              placeholderTextColor="#8C8C8C"
              onChangeText={(text) => {
                setName(text);
                setFieldErrors((previousErrors) => ({ ...previousErrors, name: false }));
              }}
            />
            <FontAwesome name="user" size={22} color="#777" style={styles.inputIcon} />
          </Pressable>

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputContainer, styles.disabledInputContainer]}>
            <Text style={styles.disabledInputText}>{user.email || 'Email address'}</Text>
            <FontAwesome name="envelope" size={20} color="#777" style={styles.inputIcon} />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <Pressable
            style={[styles.inputContainer, fieldErrors.contact && styles.errorInputContainer]}
            onPress={() => contactInputRef.current?.focus()}
          >
            <TextInput
              ref={contactInputRef}
              style={styles.input}
              value={contact}
              placeholder="Phone Number"
              placeholderTextColor="#8C8C8C"
              keyboardType="phone-pad"
              onChangeText={(text) => {
                setContact(text);
                setFieldErrors((previousErrors) => ({ ...previousErrors, contact: false }));
              }}
            />
            <FontAwesome name="phone" size={22} color="#777" style={styles.inputIcon} />
          </Pressable>

          <View style={styles.buttonContainer}>
            {(() => {
              const hasChanges = name.trim() !== (user.name || '').trim() || contact.trim() !== (user.contact || '').trim();
              const isDisabled = isSaving || !hasChanges;
              return (
            <TouchableOpacity
              style={[styles.button, isDisabled && styles.disabledButton]}
              onPress={handleUpdateDetails}
              disabled={isDisabled}
            >
              {isSaving ? (
                <View style={styles.savingContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.buttonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Update Profile</Text>
              )}
            </TouchableOpacity>
              );
            })()}
          </View>
        </ScrollView>
      )}
      <Modal
        visible={showProfileUpdated}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.notificationOverlay} pointerEvents="none">
          <View style={styles.notificationCard}>
            <View style={styles.notificationIconBox}>
              <Image source={notificationBellIcon} style={styles.notificationIcon} />
            </View>
            <Text style={styles.notificationText}>Profile Updated</Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: Platform.OS === 'ios' ? 34 : 28,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 8,
  },
  loadingStateContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
  profileBox: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profileImage: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#D8D8D8',
  },
  profileImageInitials: {
    fontSize: 46,
  },
  label: {
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 24,
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
  input: {
    flex: 1,
    color: '#333333',
    fontSize: 16,
    outlineStyle: 'none',
  },
  disabledInputContainer: {
    opacity: 0.72,
  },
  disabledInputText: {
    flex: 1,
    color: '#666666',
    fontSize: 16,
  },
  inputIcon: {
    marginLeft: 14,
  },
  buttonContainer: {
    marginTop: 32,
  },
  button: {
    height: 68,
    borderRadius: 18,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  savingButton: {
    opacity: 0.82,
  },
  disabledButton: {
    backgroundColor: '#AAAAAA',
    shadowOpacity: 0,
    elevation: 0,
  },
  savingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  notificationCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.82)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
  },
  notificationIconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 58, 58, 0.72)',
    marginBottom: 16,
  },
  notificationIcon: {
    width: 34,
    height: 40,
    resizeMode: 'contain',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
});

export default EditProfileScreen;
