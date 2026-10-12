import { useCallback, useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { trimPhotoUrl, getPhotoUrlError } from '../config/photoUrl';
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
    photoURL: null,
  });

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saveError, setSaveError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showProfileUpdated, setShowProfileUpdated] = useState(false);
  const nameInputRef = useRef(null);
  const contactInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const focusControllerRef = useRef(null);
  const savingRef = useRef(false);

  const photoChanged = trimPhotoUrl(photoURL) !== trimPhotoUrl(user.photoURL);
  const photoError = photoChanged ? getPhotoUrlError(photoURL) : '';
  const hasChanges = name.trim() !== (user.name || '').trim()
    || contact.trim() !== (user.contact || '').trim() || photoChanged;
  const isSaveDisabled = isProfileLoading || isSaving || !hasChanges;

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      focusControllerRef.current = controller;
      const isActive = () => focusControllerRef.current === controller && !controller.signal.aborted;
      savingRef.current = false;
      setIsSaving(false);

      const fetchUserData = async () => {
        try {
          setIsProfileLoading(true);
          setShowProfileUpdated(false);
          setFieldErrors({});
          setSaveError('');

          const token = await AsyncStorage.getItem('token');
          if (!isActive()) return;
          if (!token) {
            router.replace('/LandingScreen');
            return;
          }

          const decoded = jwtDecode(token);
          const userEmail = decoded.sub;

          const response = await axios.get(`${API_BASE_URL}/api/users/${encodeURIComponent(userEmail)}`, {
            signal: controller.signal,
            timeout: 15000,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          const userData = response.data;
          if (!isActive()) {
            return;
          }

          if (userData.userID) {
            await AsyncStorage.setItem('userId', userData.userID.toString());
          }
          if (!isActive()) return;

          setUser({
            userID: userData.userID,
            name: userData.name,
            email: userData.email,
            contact: userData.contact,
            photoURL: userData.photoURL ?? null
          });

          setName(userData.name || '');
          setContact(userData.contact || '');
          setPhotoURL(userData.photoURL ?? '');

        } catch (error) {
          if (!isActive() || axios.isCancel(error)) return;
          console.error('Error fetching user data:', error);
          Alert.alert('Error', 'Failed to load user data');
          router.replace('/LandingScreen');
        } finally {
          if (isActive()) {
            setIsProfileLoading(false);
          }
        }
      };

      fetchUserData();

      return () => {
        controller.abort();
        if (focusControllerRef.current === controller) {
          focusControllerRef.current = null;
          savingRef.current = false;
        }
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
          notificationTimeoutRef.current = null;
        }
      };
    }, [router])
  );

  const isPhoneNumberValid = (contact) => {
    const regex = /^[0-9]{8,}$/;
    return regex.test(contact);
  };

  const handleUpdateDetails = async () => {
    const controller = focusControllerRef.current;
    const isActive = () => focusControllerRef.current === controller && !controller.signal.aborted;
    if (!controller || controller.signal.aborted || savingRef.current || isSaveDisabled) {
      return;
    }

    setFieldErrors({});
    setSaveError('');

    if (!name.trim()) {
      setFieldErrors({ name: true });
      setSaveError('Please enter your full name.');
      Alert.alert("Missing Full Name", "Please enter your full name.");
      return;
    }

    if (!isPhoneNumberValid(contact)) {
      setFieldErrors({ contact: true });
      setSaveError('Please enter a valid phone number with at least 8 digits.');
      Alert.alert("Invalid Phone Number", "Please enter a valid phone number with at least 8 digits.");
      return;
    }

    if (photoError) {
      photoInputRef.current?.focus();
      return;
    }

    const params = {
      name: name.trim(),
      email: user.email,
      contact: contact.trim(),
    };
    // Omit unchanged legacy photos; an explicitly empty value clears the photo.
    if (photoChanged) params.photoURL = trimPhotoUrl(photoURL);

    savingRef.current = true;
    try {
      setIsSaving(true);
      setShowProfileUpdated(false);
      const token = await AsyncStorage.getItem('token');
      if (!isActive()) return;
      if (!token) {
        router.replace('/LandingScreen');
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/users/id/${user.userID}`,
        null,
        {
          params,
          signal: controller.signal,
          timeout: 15000,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      if (!isActive()) return;

      const savedUser = response.data;
      setUser({
        userID: savedUser.userID,
        name: savedUser.name,
        email: savedUser.email,
        contact: savedUser.contact,
        photoURL: savedUser.photoURL ?? null,
      });
      setName(savedUser.name || '');
      setContact(savedUser.contact || '');
      setPhotoURL(savedUser.photoURL ?? '');
      setShowProfileUpdated(true);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      notificationTimeoutRef.current = setTimeout(() => {
        if (isActive()) setShowProfileUpdated(false);
      }, 2000);
    } catch (error) {
      if (!isActive() || axios.isCancel(error)) return;
      const apiMessage = error.response?.data?.message;
      setSaveError(typeof apiMessage === 'string' && apiMessage.trim()
        ? apiMessage
        : 'Could not save your profile. Your changes are still here. Please try again.');
    } finally {
      if (isActive()) {
        savingRef.current = false;
        setIsSaving(false);
      }
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
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityState={{ disabled: isSaving }}
          >
            <FontAwesome name="chevron-left" size={22} color="#101820" />
          </TouchableOpacity>

          <View style={styles.profileBox}>
            <ProfileImage
              uri={photoChanged ? (photoError ? null : trimPhotoUrl(photoURL)) : user.photoURL}
              name={name}
              style={styles.profileImage}
              textStyle={styles.profileImageInitials}
              screen="EditProfileScreen"
              userId={user.userID}
              role="profile"
            />
          </View>

          <Text style={styles.label}>Full Name</Text>
          <Pressable
            style={[styles.inputContainer, focusedField === 'name' && styles.focusedInputContainer, fieldErrors.name && styles.errorInputContainer]}
            onPress={() => nameInputRef.current?.focus()}
            disabled={isSaving}
          >
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              value={name}
              editable={!isSaving}
              accessibilityLabel="Full Name"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              placeholder="Your Name"
              placeholderTextColor="#8C8C8C"
              onChangeText={(text) => {
                setName(text);
                setSaveError('');
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
            style={[styles.inputContainer, focusedField === 'contact' && styles.focusedInputContainer, fieldErrors.contact && styles.errorInputContainer]}
            onPress={() => contactInputRef.current?.focus()}
            disabled={isSaving}
          >
            <TextInput
              ref={contactInputRef}
              style={styles.input}
              value={contact}
              editable={!isSaving}
              accessibilityLabel="Phone Number"
              onFocus={() => setFocusedField('contact')}
              onBlur={() => setFocusedField(null)}
              placeholder="Phone Number"
              placeholderTextColor="#8C8C8C"
              keyboardType="phone-pad"
              onChangeText={(text) => {
                setContact(text);
                setSaveError('');
                setFieldErrors((previousErrors) => ({ ...previousErrors, contact: false }));
              }}
            />
            <FontAwesome name="phone" size={22} color="#777" style={styles.inputIcon} />
          </Pressable>

          <Text style={styles.label}>Photo URL</Text>
          <Pressable
            style={[
              styles.inputContainer,
              styles.photoInputContainer,
              focusedField === 'photoURL' && styles.focusedInputContainer,
              !!photoError && styles.errorInputContainer,
            ]}
            onPress={() => photoInputRef.current?.focus()}
            disabled={isSaving}
          >
            <TextInput
              ref={photoInputRef}
              style={styles.input}
              value={photoURL}
              editable={!isSaving}
              accessibilityLabel="Photo URL"
              accessibilityHint="Paste a public image URL. Clear this field to remove your saved photo and use your initials."
              aria-describedby="edit-photo-error"
              aria-invalid={!!photoError}
              placeholder="Photo URL"
              placeholderTextColor="#707070"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              // Show the URL prefix at rest without controlling the editing cursor.
              selection={focusedField === 'photoURL' ? undefined : { start: 0, end: 0 }}
              onFocus={() => setFocusedField('photoURL')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => {
                setPhotoURL(text);
                setSaveError('');
              }}
            />
            <FontAwesome name="link" size={22} color="#777" style={styles.inputIcon} />
          </Pressable>
          <Text
            nativeID="edit-photo-error"
            style={photoError ? styles.errorText : styles.emptyErrorText}
            accessibilityLiveRegion="polite"
            role={photoError ? 'alert' : undefined}
          >
            {photoError}
          </Text>

          {!!saveError && (
            <Text style={styles.errorText} role="alert" accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, isSaveDisabled && styles.disabledButton]}
              onPress={handleUpdateDetails}
              disabled={isSaveDisabled}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaveDisabled, busy: isSaving }}
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
  photoInputContainer: {
    overflow: 'hidden',
  },
  focusedInputContainer: {
    borderWidth: 2,
    borderColor: '#101820',
  },
  errorText: {
    marginTop: 10,
    color: '#A51D3F',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyErrorText: {
    height: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
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
