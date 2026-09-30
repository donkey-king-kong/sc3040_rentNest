import { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { FontAwesome } from '@expo/vector-icons';
import MorphingInfinity from '../components/MorphingInfinity';

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
    }, [router])
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
      <TouchableOpacity
        style={[styles.backButton, styles.loadingBackButton]}
        onPress={() => router.push('/ProfileScreen')}
      >
        <FontAwesome name="chevron-left" size={22} color="#101820" />
      </TouchableOpacity>
      <View style={styles.loadingContainer}>
        <MorphingInfinity size={86} color="#2FA84F" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 20}
        style={styles.flex1}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {isProfileLoading ? renderLoadingState() : (
            <View style={styles.innerContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/ProfileScreen')}
                disabled={isSaving}
              >
                <FontAwesome name="chevron-left" size={22} color="#101820" />
              </TouchableOpacity>

              <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentContainerInner} keyboardShouldPersistTaps="handled">
                <View style={styles.profileBox}>
                  <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
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
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, isSaving && styles.savingButton]}
                  onPress={handleUpdateDetails}
                  disabled={isSaving}
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
              </View>
            </View>
          )}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  flex1: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 44,
  },
  loadingStateContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
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
  },
  loadingBackButton: {
    position: 'absolute',
    top: 44,
    left: 22,
    zIndex: 2,
  },
  contentContainer: {
    flex: 1,
  },
  contentContainerInner: {
    paddingTop: 34,
    paddingBottom: 16,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 28,
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
  savingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    width: Math.round(SCREEN_WIDTH * 0.4),
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.88)',
    borderRadius: 16,
    paddingVertical: Math.round(SCREEN_WIDTH * 0.045),
    paddingHorizontal: Math.round(SCREEN_WIDTH * 0.04),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
  notificationIconBox: {
    width: Math.round(SCREEN_WIDTH * 0.12),
    height: Math.round(SCREEN_WIDTH * 0.12),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 58, 58, 0.72)',
    marginBottom: Math.round(SCREEN_WIDTH * 0.025),
  },
  notificationIcon: {
    width: Math.round(SCREEN_WIDTH * 0.055),
    height: Math.round(SCREEN_WIDTH * 0.065),
    resizeMode: 'contain',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: Math.round(SCREEN_WIDTH * 0.038),
    fontWeight: '800',
  },
});

export default EditProfileScreen;
