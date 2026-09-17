import React, { useEffect, useState, useMemo } from 'react';
import {View, Text, StyleSheet, Image, FlatList, TouchableOpacity} from 'react-native';
import NavigationBar from '../components/NavigationBar';
import {useRouter} from "expo-router";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { jwtDecode } from 'jwt-decode';

// Import icons
import profilePic from '../assets/images/chatProfilePic.jpg';

const ChatsScreen = () => {
  console.log('[ChatsScreen] Component initialized');
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialDataFetched, setInitialDataFetched] = useState(false);

  // First useEffect: Fetch initial data
  useEffect(() => {
    console.log('[ChatsScreen] Starting initial data fetch');
    let isMounted = true;

    const fetchData = async () => {
      try {
        console.log('[ChatsScreen] Attempting to retrieve token');
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.log('[ChatsScreen] No token found - redirecting to login');
          router.replace('/LoginScreen');
          return;
        }
        console.log('[ChatsScreen] Token successfully retrieved');

        // Get email from token
        const getEmailFromToken = () => {
          console.log('[ChatsScreen] Decoding JWT token');
          try {
            const decoded = jwtDecode(token);
            console.log('[ChatsScreen] Token decoded successfully, email:', decoded.sub);
            return decoded.sub;
          } catch (error) {
            console.error('[ChatsScreen] Failed to decode token:', error);
            return "sampleText@gmail.com" // Default value if decode fails
          }
        };
        const currentUserEmail = getEmailFromToken();

        // Fetch current user data
        console.log('[ChatsScreen] Fetching current user data');
        const userResponse = await axios.get(`${API_BASE_URL}/api/users/${currentUserEmail}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        });
        
        if (!isMounted) return;

        console.log('[ChatsScreen] User response data:', userResponse.data);
        
        const userData = {
          userID: userResponse.data.userID,
          name: userResponse.data.name,
          email: userResponse.data.email,
          photoURL: userResponse.data.photoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg"
        };
        console.log('[ChatsScreen] Current user data retrieved:', userData);
        setCurrentUser(userData);

        // Fetch chat history
        console.log('[ChatsScreen] Fetching chat history');
        const chatResponse = await axios.get(`${API_BASE_URL}/api/chathistory/user/${userData.userID}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        });

        if (!isMounted) return;

        console.log('[ChatsScreen] Chat response data:', chatResponse.data);
        setMessages(chatResponse.data);
        
      } catch (error) {
        console.error('[ChatsScreen] Error in initial data fetch:', error);
        console.error('[ChatsScreen] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setInitialDataFetched(true);
          console.log('[ChatsScreen] Initial data fetch completed');
        }
      }
    };

    fetchData();

    return () => {
      console.log('[ChatsScreen] Cleaning up initial data fetch effect');
      isMounted = false;
    };
  }, []);

  // Second useEffect: Process messages after initial data fetch
  useEffect(() => {
    if (!initialDataFetched) {
      console.log('[ChatsScreen] Waiting for initial data fetch to complete');
      return;
    }

    console.log('[ChatsScreen] Starting message processing');
    if (messages.length > 0 && currentUser) {
      console.log('[ChatsScreen] Processing messages into chats');
      const processMessages = () => {
        // Create a map to store latest message for each chat partner
        const chatPartnerMap = new Map();
        
        messages.forEach(msg => {
          const currentDate = new Date(msg.date);
          console.log('[ChatsScreen] Processing message:', {
            messageId: msg.messageID,
            date: currentDate,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            senderPhotoURL: msg.senderPhotoURL,
            receiverPhotoURL: msg.receiverPhotoURL
          });
          
          // Determine chat partner ID
          const chatPartnerId = msg.senderId === currentUser.userID ? msg.receiverId : msg.senderId;
          
          // If this chat partner hasn't been seen or this message is newer
          if (!chatPartnerMap.has(chatPartnerId) || 
              currentDate > new Date(chatPartnerMap.get(chatPartnerId).date)) {
            console.log('[ChatsScreen] Updating latest message for chat partner:', chatPartnerId);
            chatPartnerMap.set(chatPartnerId, msg);
          }
        });
        
        // Convert map to array and sort by date
        const sortedMessages = Array.from(chatPartnerMap.values())
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('[ChatsScreen] Processed messages count:', sortedMessages.length);
        console.log("SortedMessages :", sortedMessages);
        
        setChats(sortedMessages);
        console.log('[ChatsScreen] Message processing completed');
      };

      processMessages();
    } else {
      console.log('[ChatsScreen] No messages or user data to process yet');
    }
  }, [initialDataFetched, messages, currentUser]); // Added initialDataFetched as dependency

  const renderItem = ({ item }) => {
    if (!currentUser) return null;
    
    // Determine chat partner based on senderId/receiverId
    const isCurrentUserSender = item.senderId === currentUser.userID;
    const chatPartnerName = isCurrentUserSender ? item.receiverName : item.senderName;
    const chatPartnerId = isCurrentUserSender ? item.receiverId : item.senderId;
    const chatPartnerPhotoURL = isCurrentUserSender ? 
      (item.receiverPhotoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg") : 
      (item.senderPhotoURL || "https://images.healthshots.com/healthshots/en/uploads/2020/12/08182549/positive-person.jpg");
    
    console.log('[ChatsScreen] Rendering chat item:', {
      messageId: item.messageID,
      partnerName: chatPartnerName,
      partnerId: chatPartnerId,
      partnerPhotoURL: chatPartnerPhotoURL
    });

    return (
      <TouchableOpacity 
        onPress={() => {
          console.log('[ChatsScreen] Navigating to chat with user:', chatPartnerId);
          router.push(`/ChatsScreen2?partnerUserId=${chatPartnerId}&currentUser=${currentUser.userID}`);
        }}
      >
        <View style={styles.chatContainer}>
          <Image 
            source={{ uri: chatPartnerPhotoURL }}
            style={styles.avatar}
            defaultSource={profilePic}
          />
          <View style={styles.chatContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.senderName}>{chatPartnerName}</Text>
              <Text style={styles.date}>{new Date(item.date).toLocaleTimeString()}</Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.content]}>
        <Text>Loading chats...</Text>
      </View>
    );
  }

  console.log('[ChatsScreen] Rendering main component with', chats.length, 'chats');
  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.header}>Chats</Text>
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item) => item.messageID.toString()}
        />
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatsScreen;
