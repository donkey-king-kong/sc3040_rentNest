import { useCallback, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import NavigationBar from '../components/NavigationBar';
import {useFocusEffect, useRouter} from "expo-router";
import MorphingInfinity from '../components/MorphingInfinity';
import ProfileImage from '../components/ProfileImage';
import { chatData } from '../config/chatData';

import noActiveChatsImage from '../assets/images/noActiveChats.png';

const ChatsScreen = () => {
  const router = useRouter();
  const cached = chatData.peekSummaries();
  const [chats, setChats] = useState(cached?.chats || []);
  const [currentUserId, setCurrentUserId] = useState(cached?.currentUserId || null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const activeRequest = useRef(null);
  const hasVisibleChats = useRef(chats.length > 0);

  const refreshChats = useCallback(async (manual = false) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (manual) setIsRefreshing(true);
    else if (!hasVisibleChats.current) setIsLoading(true);
    setError('');
    try {
      const data = await chatData.loadSummaries({
        force: true,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        hasVisibleChats.current = data.chats.length > 0;
        setChats(data.chats);
        setCurrentUserId(data.currentUserId);
      }
    } catch (requestError) {
      if (controller.signal.aborted) return;
      if (requestError?.code === 'UNAUTHENTICATED') {
        router.replace('/LoginScreen');
      } else {
        setError('Chats could not be refreshed. Check your connection and try again.');
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [router]);

  useFocusEffect(useCallback(() => {
    const cachedData = chatData.peekSummaries();
    if (cachedData) {
      hasVisibleChats.current = cachedData.chats.length > 0;
      setChats(cachedData.chats);
      setCurrentUserId(cachedData.currentUserId);
      setIsLoading(false);
    }
    refreshChats(false);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshChats(false);
    });
    return () => {
      subscription.remove();
      activeRequest.current?.abort();
    };
  }, [refreshChats]));

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity 
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${item.partnerName}`}
        onPress={() => {
          router.push(`/ChatsScreen2?partnerUserId=${item.partnerId}&currentUser=${currentUserId}`);
        }}
      >
        <View style={styles.chatContainer}>
          <ProfileImage
            uri={item.partnerPhotoURL}
            name={item.partnerName}
            style={styles.avatar}
            textStyle={styles.avatarInitials}
            screen="ChatsScreen"
            userId={item.partnerId}
            role="chat-partner"
            diagnostics={false}
          />
          <View style={styles.chatContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.senderName}>{item.partnerName}</Text>
              <Text style={styles.date}>
                {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyTextContainer}>
        <Text style={styles.emptyTitle}>No Active Chats</Text>
        <Text style={styles.emptyDescription}>
          There are currently no chats from any of your properties.
        </Text>
      </View>
      <Image
        source={noActiveChatsImage}
        style={styles.emptyImage}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.header}>Chats</Text>
        {error ? (
          <View style={styles.statusRow}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => refreshChats(true)}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {isLoading && chats.length === 0 ? (
          <View style={styles.loadingScreen}>
            <MorphingInfinity size={86} color="#2FA84F" />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderItem}
            keyExtractor={(item) => item.messageID.toString()}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={chats.length === 0 ? styles.emptyListContent : null}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => refreshChats(true)}
                tintColor="#2FA84F"
              />
            }
          />
        )}
      </View>
      <NavigationBar style={styles.navigationBar} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  chatContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 5,
  },
  avatarInitials: {
    fontSize: 18,
  },
  chatContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
  },
  message: {
    marginTop: 5,
    fontSize: 16,
  },
  date: {
    marginTop: 5,
    color: '#999',
    fontSize: 16,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 24,
    color: '#101820',
    fontSize: 18,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4F2',
  },
  errorText: {
    flex: 1,
    color: '#7D251D',
    fontSize: 14,
    lineHeight: 20,
  },
  retryText: {
    color: '#176B31',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyTitle: {
    color: '#333',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#888',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyImage: {
    width: 220,
    height: 160,
  },
});

export default ChatsScreen;
