import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import ModerationListState, { moderationLoadError } from '../components/ModerationListState';
import { AdminHeader, AdminLoadingState } from '../components/AdminUI';
import ProfileImage from '../components/ProfileImage';
import { moderationDismissals, useModerationDismissals } from '../config/moderationDismissals';

const BanUsersScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [flaggedUsersData, setFlaggedUsersData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const router = useRouter();
  const requestVersion = useRef(0);
  const dismissals = useModerationDismissals('users');
  const seenCompletionVersion = useRef(dismissals.completionVersion);

  const getFlaggedUsers = useCallback(async () => {
    const version = ++requestVersion.current;
    setRefreshing(true);
    setLoadError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (version !== requestVersion.current) return;
      
      if (!token) {
        console.log('No token found!');
        router.replace('/LoginScreen');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/users/admin/flagged`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      console.log(response.data)
      const transformedData = response.data.map(user => ({
        userid: user.userID,
        name: user.name,
        email: user.email,
        flagged: user.flagged,
        photoURL: user.photoURL || null
      }));
      console.log(transformedData)

      if (version !== requestVersion.current) return;
      moderationDismissals.reconcile(
        'users',
        transformedData.map(user => user.userid),
      );
      setFlaggedUsersData(transformedData);
    } catch (error) {
      if (version !== requestVersion.current) return;
      console.error("An error occurred:", error);
      setFlaggedUsersData([]);
      setLoadError(moderationLoadError(error, 'users'));
    } finally {
      if (version === requestVersion.current) setRefreshing(false);
    }
  }, [router]);

  const onRefresh = useCallback(() => getFlaggedUsers(), [getFlaggedUsers]);

  // Search function to filter flagged users by name
  const filterUsers = (users, query) => {
    if (!query) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  useFocusEffect(useCallback(() => {
    void getFlaggedUsers();
    return () => { requestVersion.current += 1; };
  }, [getFlaggedUsers]));

  useEffect(() => {
    if (seenCompletionVersion.current === dismissals.completionVersion) return;
    seenCompletionVersion.current = dismissals.completionVersion;
    void getFlaggedUsers();
  }, [dismissals.completionVersion, getFlaggedUsers]);

  if (!flaggedUsersData) {
    return (
      <AdminLoadingState message="Loading flagged users..." />
    );
  }

  const visibleUsers = flaggedUsersData.filter(
    user => !moderationDismissals.isPending('users', user.userid),
  );

  return (
    <View style={styles.container}>
      <AdminHeader title="Ban Flagged Users" onBack={() => router.replace('/AdminScreen')} backLabel="Back to admin" inset />

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by user name..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* FlatList for flagged users */}
      <FlatList
        data={filterUsers(visibleUsers, searchQuery)}
        keyExtractor={item => String(item.userid)}
        ListEmptyComponent={
          <ModerationListState
            loading={flaggedUsersData === null && !loadError}
            error={loadError}
            searching={!!searchQuery}
            emptyText="No reported users right now."
            onRetry={getFlaggedUsers}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.userBox}>
            {/* User Image */}
            <ProfileImage
              uri={item.photoURL}
              name={item.name}
              style={styles.userImage}
              textStyle={styles.userImageInitials}
              screen="BanUserScreen"
              userId={item.userid}
              role="flagged-user"
            />
            {/* User Name */}
            <Text style={styles.userName}>{item.name}</Text>
            {/* Review Button */}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push(`/BanUserScreen2?userid=${item.userid}`)}
            >
              <Text style={styles.reviewButtonText}>Review</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F8FA',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: '#000', // Add text color
  },
  userBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 15,
    marginRight: 15,
  },
  userImageInitials: {
    fontSize: 18,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  reviewButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default BanUsersScreen;
