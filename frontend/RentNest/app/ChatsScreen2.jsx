import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Modal, TextInput, ScrollView, Dimensions, Animated, StatusBar, ActivityIndicator} from 'react-native';
import {useLocalSearchParams, useRouter} from "expo-router";
import { FontAwesome } from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Import Icons
import sendIcon from '../assets/images/send.jpg';
import flag from "../assets/images/chatflag.jpg";
import paperclip from "../assets/images/paperclip.jpg"
import sendRentalOfferIcon from "../assets/images/sendRentalOffer.jpg"
import x from "../assets/images/x.jpg"
import redFlag from "../assets/images/flag.png";
import visa from "../assets/images/visa.jpg";
import master from "../assets/images/master.jpg";
import amex from "../assets/images/amex.jpg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_BASE_URL} from "../config/api";
import MorphingInfinity from '../components/MorphingInfinity';
import AvatarOrb from '../components/AvatarOrb';

const errorIcon = require('../assets/images/errorIcon.png');
const retryButtonIcon = require('../assets/images/retryButton.png');
const profilePic = require('../assets/images/chatProfilePic.jpg');
const notificationBellIcon = require('../assets/images/notificationBell.png');

const ChatsScreen2 = () => {
    const router = useRouter();
    const safeAreaInsets = useSafeAreaInsets();
    const { partnerUserId, currentUser} = useLocalSearchParams();
    const [chat, setChat] = useState([]);
    const [rental, setRental] = useState([]);
    const [request, setRequest] = useState([]);
    const [partner, setPartner] = useState([]);
    const [listing, setListing] = useState([]);
    const [rentalPrice, setRentalPrice] = useState('');
    const [rentalDeposit, setRentalDeposit] = useState('');
    const [rentalDate, setRentalDate] = useState('');
    const [leaseExpiry, setLeaseExpiry] = useState('');
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false)
    const [isRentalModalVisible, setRentalModalVisible] = useState(false)
    const [isFlagModalVisible, setFlagModalVisible] = useState(false)
    const [isReportingUser, setReportingUser] = useState(false)
    const [userReportNotificationMessage, setUserReportNotificationMessage] = useState('')
    const [newMessage, setNewMessage] = useState('');
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false)
    const [isPaymentSuccessfulModalVisible, setPaymentSuccessfulModalVisible] = useState(false)
    const [isPayingDeposit, setIsPayingDeposit] = useState(false)
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardNumberError, setCardNumberError] = useState('');
    const [cardExpiryError, setCardExpiryError] = useState('');
    const [cardCvvError, setCardCvvError] = useState('');
    const [Loading, setLoading] = useState(true);
    const chatScrollRef = useRef(null);
    const notificationTimeoutRef = useRef(null);
    const summaryScrollRef = useRef(null);
    const depositInputRef = useRef(null);
    const leaseStartInputRef = useRef(null);
    const leaseEndInputRef = useRef(null);
    const summarySheetY = useRef(new Animated.Value(600)).current;
    const [isSummaryModalVisible, setSummaryModalVisible] = useState(false);
    const [parsedSummary, setParsedSummary] = useState(null);
    const [isGeneratingSummary, setGeneratingSummary] = useState(false);
    const [chatSummary, setChatSummary] = useState('');
    const [summaryError, setSummaryError] = useState('');
    const [isSummaryPlaceholder, setSummaryPlaceholder] = useState(true);
    const [summaryCache, setSummaryCache] = useState(null);
    const [isAskAiModalVisible, setAskAiModalVisible] = useState(false);
    const [aiQuestion, setAiQuestion] = useState('');
    const [submittedAiQuestion, setSubmittedAiQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [aiAnswerCategory, setAiAnswerCategory] = useState('');
    const [isAiAnswerPlaceholder, setAiAnswerPlaceholder] = useState(false);
    const [isAskingAi, setAskingAi] = useState(false);
    const { refresh } = useLocalSearchParams();

    const getConversation = async () => {
        try {
            console.log('[getConversation] Partner User ID:', partnerUserId);
            console.log('[getConversation] Current User ID:', currentUser);

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const chatResponse = await axios.get(`${API_BASE_URL}/api/chathistory/conversation`, {
                params:{
                    userA: partnerUserId,
                    userB: currentUser
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log("Conversations response", chatResponse.data);
            const chatData = Array.isArray(chatResponse.data) ? chatResponse.data : [];
            setChat(chatData); // Store the fetched data in state
            if (chatData.length > 0) {
                await Promise.all(chatData.map((msg) => {
                    if (msg.rentalId != null) {
                        return getRental(msg.rentalId);
                    }
                    if (msg.requestId != null) {
                        console.log("requestid",msg.requestId);
                        return getRequest(msg.requestId);
                    }
                    return Promise.resolve();
                }));
            }
            await getPartner();
            setLoading(false);
        } catch (error) {
            console.error('Error fetching conversation:', error);
            setChat([]);
            setLoading(false);
        }
    };

    const getRental = async (rentalId) => {
        try {
            if (rentalId == null) {
                console.log('No rentalId found in the chat.');
                return;
            }

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const rentalResponse = await axios.get(`${API_BASE_URL}/api/rentals/${rentalId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log("Rental response", rentalResponse.data);
            setRental(rentalResponse.data); // Store the fetched data in state
        } catch (error) {
            console.error('Error fetching rentals:', error);
        }
    }

    const getRequest = async (requestId) => {
        try {
            if (requestId == null) {
                console.log('No requestId found in the chat.');
                return;
            }

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const requestResponse = await axios.get(`${API_BASE_URL}/api/requests/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log("Request response", requestResponse.data);
            setRequest(requestResponse.data); // Store the fetched data in state
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    }

    const getListing = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const listingResponse = await axios.get(`${API_BASE_URL}/api/listings/user/${currentUser}/listingIDs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log("Listing response " + listingResponse.data);
            setListing(listingResponse.data);
            setLoading(false);
        }catch (error) {
            console.error('Error fetching listings:', error);
        }
    }

    const getPartner = async () => {
        try{
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const partnerResponse = await axios.get(`${API_BASE_URL}/api/users/id/${partnerUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            console.log("Partner response", partnerResponse.data);
            setPartner(partnerResponse.data); // Store the fetched data in state
        }
        catch (error) {
            console.error('Error fetching partner:', error);
        }
    }

    const getUserReportStorageKey = () => {
        if (!currentUser || !partnerUserId) {
            return null;
        }

        return `reportedUser:${currentUser}:${partnerUserId}`;
    };

    const showUserReportNotification = (message) => {
        setUserReportNotificationMessage(message);
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = setTimeout(() => {
            setUserReportNotificationMessage('');
        }, 2000);
    };

    const syncUserReportStatus = async (reportStorageKey) => {
        if (!reportStorageKey) {
            return;
        }

        const token = await AsyncStorage.getItem('token');
        if (!token) {
            router.replace('/LoginScreen');
            return;
        }

        const partnerResponse = await axios.get(`${API_BASE_URL}/api/users/id/${partnerUserId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        const isPartnerFlagged = Number(partnerResponse.data?.flagged) !== 0;

        if (!isPartnerFlagged) {
            await AsyncStorage.removeItem(reportStorageKey);
            setPartner(partnerResponse.data);
        }
    };

    const flagUser = async () => {
        if (isReportingUser) {
            return;
        }

        try{
            setReportingUser(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const reportStorageKey = getUserReportStorageKey();
            const flaggedResponse = await axios.put(`${API_BASE_URL}/api/users/setFlag/${partnerUserId}/1`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (flaggedResponse.status === 200){
                if (reportStorageKey) {
                    await AsyncStorage.setItem(reportStorageKey, 'true');
                }
                setFlagModalVisible(false);
                showUserReportNotification('User Reported');
                await getPartner();
            }else{
                console.error('Flagging failed:', flaggedResponse.data)
            }
        }
        catch (error) {
            console.error('Error flagging partner:', error);
        }
        finally {
            setReportingUser(false);
        }
    }

    const getSenderPhotoURL = () => {
        const existingSenderMessage = chat.find(
            (message) => Number(message.senderId) === Number(currentUser) && message.senderPhotoURL
        );

        return existingSenderMessage?.senderPhotoURL || null;
    };

    const buildOptimisticMessage = (messageText, tempMessageId) => ({
        messageID: tempMessageId,
        receiverId: Number(partnerUserId),
        receiverName: partner.name,
        receiverPhotoURL: partner.photoURL,
        senderId: Number(currentUser),
        senderName: 'You',
        senderPhotoURL: getSenderPhotoURL(),
        rentalId: chat.rentalId || null,
        requestId: chat.requestId || null,
        message: messageText,
        date: new Date().toISOString(),
        deliveryStatus: 'sending',
    });

    const sendMessageToBackend = async(messageText, tempMessageId) => {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            console.log('No token found!');
            router.replace('/LoginScreen');
            throw new Error('Missing authentication token');
        }

        console.log('rentalID:', chat.rentalId || null);
        console.log('requestID:', chat.requestId || null);
        const body = {
            receiverID: partnerUserId,
            senderID: currentUser,
            rentalID: chat.rentalId || null,
            requestID: chat.requestId || null,
            message: messageText,
            date: new Date().toISOString(),
        };
        const sendChatResponse = await axios.post(`${API_BASE_URL}/api/chathistory`, body,{
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        });

        if (sendChatResponse.status === 201){
            setChat((previousChat) => previousChat.map((message) => (
                message.messageID === tempMessageId
                    ? { ...sendChatResponse.data, deliveryStatus: 'sent' }
                    : message
            )));
        }else{
            console.log('Sending Message:', sendChatResponse.data);
            setChat((previousChat) => previousChat.map((message) => (
                message.messageID === tempMessageId
                    ? { ...message, deliveryStatus: 'failed' }
                    : message
            )));
        }
    };

    const sendMessage = async() => {
        const messageText = newMessage.trim();
        if (messageText === ''){
            return;
        }

        const tempMessageId = `temp-${Date.now()}`;
        const optimisticMessage = buildOptimisticMessage(messageText, tempMessageId);
        setNewMessage('');
        setChat((previousChat) => [...previousChat, optimisticMessage]);

        try{
            await sendMessageToBackend(messageText, tempMessageId);
        }
        catch (error) {
            console.error('Error sending message:', error);
            setChat((previousChat) => previousChat.map((message) => (
                message.messageID === tempMessageId
                    ? { ...message, deliveryStatus: 'failed' }
                    : message
            )));
        }
    }

    const retryMessage = async(messageToRetry) => {
        const retryMessageId = `temp-${Date.now()}`;
        setChat((previousChat) => previousChat.map((message) => (
            message.messageID === messageToRetry.messageID
                ? { ...message, messageID: retryMessageId, deliveryStatus: 'sending' }
                : message
        )));

        try {
            await sendMessageToBackend(messageToRetry.message, retryMessageId);
        } catch (error) {
            console.error('Error retrying message:', error);
            setChat((previousChat) => previousChat.map((message) => (
                message.messageID === retryMessageId
                    ? { ...message, deliveryStatus: 'failed' }
                    : message
            )));
        }
    };

    const getChatSummaryCacheKey = () => {
        if (!Array.isArray(chat) || chat.length === 0) {
            return `${partnerUserId}-${currentUser}-empty`;
        }

        const latestMessage = chat[chat.length - 1];
        return [
            partnerUserId,
            currentUser,
            chat.length,
            latestMessage?.messageID || '',
            latestMessage?.date || '',
            latestMessage?.senderId || '',
            latestMessage?.message || '',
        ].join('|');
    }

    const parseSummaryJson = (summaryText) => {
        if (!summaryText) {
            return null;
        }

        const cleanedSummary = summaryText
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        return JSON.parse(cleanedSummary);
    }

    const getChatSummary = async () => {
        const cacheKey = getChatSummaryCacheKey();

        if (summaryCache?.key === cacheKey) {
            setSummaryError('');
            setChatSummary(summaryCache.summary);
            setSummaryPlaceholder(summaryCache.placeholder);
            try { setParsedSummary(parseSummaryJson(summaryCache.summary)); } catch { setParsedSummary(null); }
            summarySheetY.setValue(600);
            setSummaryModalVisible(true);
            Animated.spring(summarySheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
            return;
        }

        try {
            setGeneratingSummary(true);
            setSummaryError('');
            setChatSummary('');

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }

            const summaryResponse = await axios.get(`${API_BASE_URL}/api/ai-chat/summary`, {
                params: {
                    userA: partnerUserId,
                    userB: currentUser
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });

            const generatedSummary = summaryResponse.data?.summary || 'No summary available.';
            const isPlaceholderSummary = summaryResponse.data?.placeholder ?? true;

            setChatSummary(generatedSummary);
            setSummaryPlaceholder(isPlaceholderSummary);
            setSummaryCache({
                key: cacheKey,
                summary: generatedSummary,
                placeholder: isPlaceholderSummary,
            });
            try { setParsedSummary(parseSummaryJson(generatedSummary)); } catch { setParsedSummary(null); }
            summarySheetY.setValue(600);
            setSummaryModalVisible(true);
            Animated.spring(summarySheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        } catch (error) {
            console.error('Error generating chat summary:', error);
            setSummaryError('Unable to generate chat summary right now.');
            setSummaryPlaceholder(false);
            setParsedSummary(null);
            summarySheetY.setValue(600);
            setSummaryModalVisible(true);
            Animated.spring(summarySheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        } finally {
            setGeneratingSummary(false);
        }
    }

    const askAiQuestion = async () => {
        const questionToAsk = aiQuestion.trim();
        if (questionToAsk === '') {
            return;
        }

        try {
            setAskingAi(true);
            setSubmittedAiQuestion(questionToAsk);
            setAiAnswer('');
            setAiAnswerCategory('');
            setAiAnswerPlaceholder(false);

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }

            const askAiResponse = await axios.post(`${API_BASE_URL}/api/ai-chat/ask`, {
                userA: partnerUserId,
                userB: currentUser,
                question: questionToAsk,
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });

            setAiAnswer(askAiResponse.data?.answer || 'No AI answer available.');
            setAiAnswerCategory(askAiResponse.data?.category || '');
            setAiAnswerPlaceholder(askAiResponse.data?.placeholder ?? true);
        } catch (error) {
            console.error('Error asking AI question:', error);
            setAiAnswer('Unable to ask AI right now.');
            setAiAnswerCategory('error');
            setAiAnswerPlaceholder(false);
        } finally {
            setAskingAi(false);
            setAiQuestion('');
        }
    }

    const handleAiQuestionKeyPress = (event) => {
        const nativeEvent = event.nativeEvent || {};
        if (nativeEvent.key !== 'Enter') {
            return;
        }

        if (nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey) {
            return;
        }

        event.preventDefault?.();
        askAiQuestion();
    }

    const getAiAnswerTitle = () => {
        if (aiAnswerCategory === 'chat_summary') {
            return 'Chat Summary';
        }

        if (aiAnswerCategory === 'out_of_scope') {
            return 'Unable to Answer';
        }

        return 'AI Response';
    }

    const renderAiAnswer = () => {
        const lines = aiAnswer
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            return null;
        }

        return lines.map((line, index) => {
            const cleanedLine = line.replace(/^[-•]\s*/, '');
            const labelMatch = cleanedLine.match(/^([^:]{2,42}):\s*(.+)$/);

            if (labelMatch) {
                return (
                    <View key={`${cleanedLine}-${index}`} style={styles.aiAnswerDetailRow}>
                        <Text style={styles.aiAnswerDetailLabel}>{labelMatch[1]}</Text>
                        <Text style={styles.aiAnswerDetailValue}>{labelMatch[2]}</Text>
                    </View>
                );
            }

            return (
                <Text key={`${cleanedLine}-${index}`} style={styles.aiAnswerParagraph}>
                    {cleanedLine}
                </Text>
            );
        });
    }

    const sendRentalOffer = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            console.log("listingid", listing)
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const _startDate = parseDMY(rentalDate);
            const _endDate = parseDMY(leaseExpiry);
            if (rentalPrice.trim() !== '' && rentalDeposit.trim() !== '' && _startDate && _endDate && _endDate > _startDate){
                const rentalBody = {
                    rentalDTO: {
                        listingID: listing[0],
                        tenantUserID: partnerUserId,
                        rentalPrice: rentalPrice,
                        depositPrice: rentalDeposit,
                        rentalDate: _startDate.toISOString(),
                        leaseExpiry: _endDate.toISOString(),
                        paymentHistory: "First payment made on " + new Date().toISOString(),
                        status: "pending",
                    },
                    chatHistoryDTO: {
                        request: null,
                        date: new Date().toISOString(),
                    },
                };
                console.log("rental body:", rentalBody)
                const sendRentalResponse = await axios.post(`${API_BASE_URL}/api/rentals/createRentalOffer?senderID=${currentUser}&receiverID=${partnerUserId}`, rentalBody,{
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                });
                if (sendRentalResponse.status === 200){
                    // refresh is handled in handleSendOffer after modal closes
                }else{
                    console.log('Creating Rental:', sendRentalResponse.data);
                }
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }

    const acceptRentalOffer = async () => {
        console.log("Rental ID" , rental.rentalID);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const updatedRentalBody = {
                listingID: rental.listingId,
                tenantUserID: Number(currentUser),
                rentalPrice: rental.rentalPrice,
                depositPrice: rental.depositPrice,
                rentalDate: rental.rentalDate,
                leaseExpiry: rental.leaseExpiry,
                paymentHistory: rental.paymentHistory,
                status: "active",
            };
            const acceptOfferResponse = await axios.put(`${API_BASE_URL}/api/rentals/reviewRentalOffer/${rental.rentalID}`, updatedRentalBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });
            // const editListingResponse = await axios.put(``) -> 
            if (acceptOfferResponse.status === 200) {
                await getConversation();
                console.log("Rental Offer Accepted", acceptOfferResponse.data);
            } else {
                console.log('Accepting rental offer:', acceptOfferResponse.data);
            }
        }
        catch (error) {
            console.error('Error accepting rental offer:', error);
        }
        toggleSuccessfulPaymentModal();
    }

    const acceptRequest = async() => {
        console.log("Request ID" , request.requestID);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const terminationRequestBody ={
                rentalID: request.rentalId,
                status: "terminated",
                refundAmount: request.refundAmount,
            }
            const terminateRequestResponse = await axios.put(`${API_BASE_URL}/api/requests/${request.requestID}`, terminationRequestBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });
            const terminateRentalBody = {
                listingID: rental.listingId,
                tenantUserID: partnerUserId,
                rentalPrice: rental.rentalPrice,
                depositPrice: rental.depositPrice,
                rentalDate: rental.rentalDate,
                leaseExpiry: rental.leaseExpiry,
                paymentHistory: rental.paymentHistory,
                status: "terminated",
            };
            const terminateRentalResponse = await axios.put(`${API_BASE_URL}/api/rentals/${rental.rentalID}`, terminateRentalBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });
            if (terminateRequestResponse.status === 200 && terminateRentalResponse.status === 200) {
                await getConversation();
                console.log("Rental Offer Terminated", terminateRequestResponse.data);
                console.log("Updated Rental Info", terminateRentalResponse.data);
            } else {
                console.log('Terminating rental offer:', terminateRequestResponse.data);
            }
        }
        catch (error) {
            console.error('Error terminating rental offer:', error);
        }
    }

    const handlePaymentSubmit = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }

            const paymentData = {
                rentalID: rental.rentalID,
                amount: rental.rentalPrice,
                date: new Date().toISOString(), // Convert to ISO string
            };

            const response = await axios.post(`${API_BASE_URL}/api/payment/monthlyPayment`, paymentData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 200) {
                console.log('Payment Successful', response.status, response.data)
            } else {
                console.error('Payment failed:', response.data);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    };

const handlePaymentAndAccept = async () => {
    setIsPayingDeposit(true);
    try {
        await handlePaymentSubmit();
        await acceptRentalOffer();
        toggleSuccessfulPaymentModal();
        await getConversation();
    } finally {
        setIsPayingDeposit(false);
    }
};

    useEffect(() => {
        getConversation();

        return () => {
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
        };
    }, [refresh]);

    // Toggle attachment modal visibility
    const toggleAttachmentModal = () => {
        setAttachmentModalVisible(!isAttachmentModalVisible);
    };

    // Toggle rental modal visibility
    const toggleRentalModal = async () => {
        await getListing();
        setRentalPrice('');
        setRentalDeposit('');
        setRentalDate('');
        setLeaseExpiry('');
        setRentalModalVisible(true);
    }
    const closeRentalModal = () => {
        setRentalModalVisible(false);
    };

    // Toggle flag modal visibility
    const toggleFlagModal = async () => {
        if (isFlagModalVisible) {
            setFlagModalVisible(false);
            return;
        }

        const reportStorageKey = getUserReportStorageKey();

        if (reportStorageKey) {
            try {
                await syncUserReportStatus(reportStorageKey);
                const alreadyReported = await AsyncStorage.getItem(reportStorageKey);
                if (alreadyReported === 'true') {
                    showUserReportNotification('User Already Reported');
                    return;
                }
            } catch (error) {
                console.error('Error checking reported user status:', error);
            }
        }

        setFlagModalVisible(true);
    };
    const closeFlagModal = () => {
        if (isReportingUser) {
            return;
        }

        setFlagModalVisible(false);
    }

    // Toggle payment modal visibility
    const togglePaymentModal = () => {
        if (!isPaymentModalVisible) {
            setCardNumber('');
            setCardExpiry('');
            setCardCvv('');
            setCardNumberError('');
            setCardExpiryError('');
            setCardCvvError('');
        }
        setPaymentModalVisible(!isPaymentModalVisible);
    }

    // Toggle successful payment modal visibility
    const toggleSuccessfulPaymentModal = () => {
        setPaymentModalVisible(false);
        setPaymentSuccessfulModalVisible(!isPaymentSuccessfulModalVisible);
    }

    const isFlagged = chat.length > 0 ? partner.flagged === 1 : false;
    const isAccepted = chat.length > 0 ? isPaymentSuccessfulModalVisible : false;
    const isTerminationAccepted = chat.length>0 ? rental.status === "terminated" : false;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const AvatarCircle = ({ photoURL, name, size = 30, style }) => {
        const dim = { width: size, height: size, borderRadius: size / 2 };
        if (photoURL) {
            return <Image source={{ uri: photoURL }} style={[dim, style]} />;
        }
        return (
            <View style={[dim, styles.avatarCircle, style]}>
                <Text style={[styles.avatarInitials, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
            </View>
        );
    };

    const formatOfferDate = (dateValue) => {
        if (!dateValue) {
            return 'N/A';
        }

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return String(dateValue);
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const parseDMY = (s) => {
        if (!s || !/^\d{2}-\d{2}-\d{4}$/.test(s)) return null;
        const [d, m, y] = s.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
        return date;
    };

    const formatOfferCurrency = (value) => {
        const amount = Number(value);
        if (Number.isNaN(amount)) {
            return `$${value}`;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const canSendOffer = useMemo(() => {
        const allFilled = rentalPrice.trim() !== '' && rentalDeposit.trim() !== '' && rentalDate.trim() !== '' && leaseExpiry.trim() !== '';
        const validPrice = !isNaN(Number(rentalPrice)) && Number(rentalPrice) > 0;
        const validDeposit = !isNaN(Number(rentalDeposit)) && Number(rentalDeposit) > 0;
        const start = parseDMY(rentalDate);
        const end = parseDMY(leaseExpiry);
        const validDates = !!start && !!end && end > start;
        return allFilled && validPrice && validDeposit && validDates;
    }, [rentalPrice, rentalDeposit, rentalDate, leaseExpiry]);

    const handleSendOffer = async () => {
        if (!canSendOffer) return;
        await sendRentalOffer();
        closeRentalModal();
        await getConversation();
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const renderMessage = () => {
        if (!Array.isArray(chat) || chat.length === 0) {
            return (
                <View style={styles.emptyMessageContainer}>
                    <Text style={styles.emptyMessageText}>No messages yet. Start the conversation!</Text>
                </View>
            );
        }

        const groups = [];
        chat.forEach((message) => {
            const last = groups[groups.length - 1];
            if (last && last[0].senderId === message.senderId && !message.rentalId && !message.requestId && !last[0].rentalId && !last[0].requestId) {
                last.push(message);
            } else {
                groups.push([message]);
            }
        });

        return groups.map((group, gi) => {
            const first = group[0];
            const isUser = Number(first.senderId) === Number(currentUser);
            const isOwner = Number(currentUser) === Number(rental.ownerUserId);
            const rentalIdExists = first.rentalId != null;
            const requestIdExists = first.requestId != null;
            const isRentalOfferSender = rentalIdExists && Number(first.senderId) === Number(currentUser);
            const lastMsg = group[group.length - 1];
            const timestamp = new Date(lastMsg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Special card messages (rental offer / termination)
            if (rentalIdExists || requestIdExists) {
                return (
                    <View key={first.messageID} style={styles.groupContainer}>
                        <View style={isUser ? styles.bubbleRowRight : styles.bubbleRowLeft}>
                            {!isUser && <AvatarCircle photoURL={partnerProfilePhotoURL} name={partner.name} size={30} style={{ marginRight: 8 }} />}
                            <View style={rentalIdExists ? styles.rentalOfferBubbleShell : [styles.bubble, styles.bubbleOther, { maxWidth: '80%' }]}>
                                {rentalIdExists && (
                                    <View style={styles.rentalOfferMessage}>
                                        <View style={styles.rentalOfferHeader}>
                                            <View style={styles.rentalOfferHeaderLeft}>
                                                <View style={styles.rentalOfferIconBadge}>
                                                    <FontAwesome name="home" size={14} color="#FFFFFF" />
                                                </View>
                                                <Text style={styles.rentalOfferHeaderTitle}>
                                                    {isRentalOfferSender ? 'Rental offer sent' : 'Rental offer'}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.rentalOfferStatusPill,
                                                    isRentalOfferSender ? styles.rentalOfferStatusPillPending : styles.rentalOfferStatusPillNew,
                                                    rental.status === 'active' && styles.rentalOfferStatusPillAccepted,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.rentalOfferStatusText,
                                                        isRentalOfferSender ? styles.rentalOfferStatusTextPending : styles.rentalOfferStatusTextNew,
                                                        rental.status === 'active' && styles.rentalOfferStatusTextAccepted,
                                                    ]}
                                                >
                                                    {rental.status === 'active' ? 'Accepted' : (isRentalOfferSender ? 'Pending' : 'New')}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.rentalOfferBody}>
                                            <View style={styles.rentalOfferDetailRow}>
                                                <View style={styles.rentalOfferDetailLabelGroup}>
                                                    <FontAwesome name="dollar" size={16} color="#8F8F96" style={styles.rentalOfferDetailIcon} />
                                                    <Text style={styles.rentalOfferDetailLabel}>Monthly rent</Text>
                                                </View>
                                                <Text style={[styles.rentalOfferDetailValue, styles.rentalOfferRentValue]}>
                                                    {formatOfferCurrency(rental.rentalPrice)}
                                                </Text>
                                            </View>
                                            <View style={styles.rentalOfferDetailRow}>
                                                <View style={styles.rentalOfferDetailLabelGroup}>
                                                    <FontAwesome name="shield" size={16} color="#8F8F96" style={styles.rentalOfferDetailIcon} />
                                                    <Text style={styles.rentalOfferDetailLabel}>Deposit</Text>
                                                </View>
                                                <Text style={styles.rentalOfferDetailValue}>{formatOfferCurrency(rental.depositPrice)}</Text>
                                            </View>
                                            <View style={[styles.rentalOfferDetailRow, styles.rentalOfferDetailRowLast]}>
                                                <View style={styles.rentalOfferDetailLabelGroup}>
                                                    <FontAwesome name="calendar" size={15} color="#8F8F96" style={styles.rentalOfferDetailIcon} />
                                                    <Text style={styles.rentalOfferDetailLabel}>Lease until</Text>
                                                </View>
                                                <Text style={styles.rentalOfferDetailValue}>{formatOfferDate(rental.leaseExpiry)}</Text>
                                            </View>
                                        </View>
                                        {isRentalOfferSender ? (
                                            <View style={styles.pendingAcceptanceBox}>
                                                <View style={[styles.pendingStatusDot, rental.status === 'active' && styles.acceptedStatusDot]} />
                                                <Text style={styles.pendingAcceptanceText}>
                                                    {rental.status === 'active' ? 'Accepted' : 'Awaiting tenant response'}
                                                </Text>
                                            </View>
                                        ) : rental.status === 'active' ? (
                                            <View style={styles.pendingAcceptanceBox}>
                                                <View style={[styles.pendingStatusDot, styles.acceptedStatusDot]} />
                                                <Text style={styles.pendingAcceptanceText}>Accepted</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.rentalOfferActionRow}>
                                                <TouchableOpacity style={styles.pendingRejectBox}>
                                                    <Text style={styles.rejectText}>Decline</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={togglePaymentModal} style={styles.pendingAcceptBox}>
                                                    <Text style={styles.acceptText}>Accept offer</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                                {requestIdExists && (
                                    <View style={styles.rentalOfferMessage}>
                                        <Text style={styles.rentalOfferTitle}>Termination of Lease Request</Text>
                                        <Text style={styles.messageText}>Amount to be refunded: ${request.refundAmount}</Text>
                                        {isUser ? (
                                            <View style={styles.pendingAcceptanceBox}>
                                                <Text style={styles.pendingAcceptanceText}>{isTerminationAccepted ? 'Accepted' : 'Pending Acceptance'}</Text>
                                            </View>
                                        ) : isTerminationAccepted ? (
                                            <View style={styles.pendingAcceptanceBox}>
                                                <Text style={styles.pendingAcceptanceText}>Accepted</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.buttonAlignment}>
                                                <TouchableOpacity style={styles.pendingRejectBox}>
                                                    <Text style={styles.rejectText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={acceptRequest} style={styles.pendingAcceptBox}>
                                                    <Text style={styles.acceptText}>Accept</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                        <Text style={[styles.groupTimestamp, isUser ? styles.groupTimestampRight : styles.groupTimestampLeft]}>{timestamp}</Text>
                    </View>
                );
            }

            // Regular message group
            return (
                <View key={`group-${gi}`} style={styles.groupContainer}>
                    {group.map((message, mi) => {
                        const showAvatar = !isUser && mi === 0;
                        const avatarPlaceholder = !isUser && mi > 0;
                        return (
                            <View key={message.messageID} style={isUser ? styles.bubbleRowRight : styles.bubbleRowLeft}>
                                {!isUser && (
                                    showAvatar ? (
                                        <AvatarCircle photoURL={partner.photoURL} name={partner.name} size={30} style={{ marginRight: 8 }} />
                                    ) : (
                                        <View style={styles.avatarSpacer} />
                                    )
                                )}
                                <View style={[styles.bubble, isUser ? styles.bubbleSelf : styles.bubbleOther]}>
                                    <Text style={[styles.bubbleText, isUser && styles.bubbleTextSelf]}>{message.message}</Text>
                                    {message.deliveryStatus === 'sending' && (
                                        <Text style={styles.sendingText}>Sending...</Text>
                                    )}
                                    {message.deliveryStatus === 'failed' && (
                                        <View style={styles.failedMessageContainer}>
                                            <Image source={errorIcon} style={styles.errorIcon} />
                                            <Text style={styles.failedMessageText}>Failed</Text>
                                            <TouchableOpacity style={styles.retryButton} onPress={() => retryMessage(message)}>
                                                <Image source={retryButtonIcon} style={styles.retryIcon} />
                                                <Text style={styles.retryText}>Retry</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                    <Text style={[styles.groupTimestamp, isUser ? styles.groupTimestampRight : styles.groupTimestampLeft]}>
                        {timestamp}
                    </Text>
                </View>
            );
        });
    };

    if (Loading) {
        return (
            <View style={styles.loadingScreen}>
                <MorphingInfinity size={86} color="#2FA84F" />
                <Text style={styles.loadingText}>Loading chat history...</Text>
            </View>
        );
    }

    const shouldScrollAiAnswer = aiAnswer.length > 300;
    const partnerReviewRole = rental?.ownerUserId
        ? (Number(partnerUserId) === Number(rental.ownerUserId) ? 'Owner' : 'Tenant')
        : undefined;
    const partnerProfilePhotoURL = partner.photoURL || partner.profilePhotoURL || partner.profilePicture || partner.avatar;

    return (
        <View style={[styles.container, { flex: 1 }]}>
            <StatusBar barStyle={isSummaryModalVisible ? 'light-content' : 'dark-content'} />
            {/* Header row 1: back + avatar + name + Reviews */}
            <View style={styles.nameHeaderContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color="#101820" />
                </TouchableOpacity>
                <AvatarCircle photoURL={partnerProfilePhotoURL} name={partner.name} size={36} style={{ marginRight: 10 }} />
                <Text style={styles.header}>{partner.name}</Text>
                <TouchableOpacity
                    style={styles.reviewsLink}
                    onPress={() => router.push({
                        pathname: '/UserReviewsScreen',
                        params: {
                            userId: partnerUserId,
                            currentUser,
                            revieweeName: partner.name,
                            revieweeRole: partnerReviewRole,
                            revieweePhotoURL: partnerProfilePhotoURL,
                        },
                    })}
                >
                    <Text style={styles.reviews}>Reviews</Text>
                </TouchableOpacity>
            </View>

            {/* Header row 2: Ask AI + Summarise Chat */}
            <View style={styles.headerActionsRow}>
                <TouchableOpacity onPress={() => setAskAiModalVisible(true)} style={styles.aiSummaryButton}>
                    <Text style={styles.aiSummaryButtonText}>Ask AI</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={getChatSummary} style={styles.aiSummaryButton} disabled={isGeneratingSummary}>
                    <Text style={styles.aiSummaryButtonText}>{isGeneratingSummary ? 'Summarising...' : 'Summarise Chat'}</Text>
                </TouchableOpacity>
            </View>

            {/* Thin divider */}
            <View style={styles.thinDivider} />

            <ScrollView
                ref={chatScrollRef}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
            >
                {renderMessage()}
            </ScrollView>

            {isSummaryModalVisible && (
                <View style={styles.summaryOverlay} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.summarySheetBackdrop}
                        activeOpacity={1}
                        onPress={() => setSummaryModalVisible(false)}
                    />
                    <Animated.View
                        style={[
                            styles.summarySheet,
                            {
                                paddingBottom: Math.max(safeAreaInsets.bottom, 16),
                                transform: [{ translateY: summarySheetY }],
                            },
                        ]}
                    >
                        <View style={styles.summarySheetHandle} />
                        <View style={styles.summarySheetHeader}>
                            <View style={styles.summarySheetTitleGroup}>
                                <View style={styles.summaryAiIconBadge}>
                                    <FontAwesome name="magic" size={17} color="#1890FF" />
                                </View>
                                <Text style={styles.summarySheetTitle}>AI chat summary</Text>
                            </View>
                        </View>
                        {isSummaryPlaceholder && (
                            <Text style={styles.placeholderNotice}>Currently using hardcoded placeholder summary.</Text>
                        )}
                        <ScrollView
                            ref={summaryScrollRef}
                            style={styles.summarySheetScroll}
                            contentContainerStyle={[
                                styles.summarySheetScrollContent,
                                { paddingBottom: Math.max(safeAreaInsets.bottom + 28, 44) },
                            ]}
                            showsVerticalScrollIndicator={false}
                            onLayout={() => summaryScrollRef.current?.scrollTo({ y: 0, animated: false })}
                        >
                            {summaryError ? (
                                <Text style={styles.summaryText}>{summaryError}</Text>
                            ) : parsedSummary ? (
                                <View>
                                    {parsedSummary.overview && (
                                        <View style={styles.summaryCard}>
                                            <View style={styles.summaryCardHeaderRow}>
                                                <FontAwesome name="commenting-o" size={14} color="#A4A4AD" style={styles.summaryCardIcon} />
                                                <Text style={styles.summaryCardLabel}>Overview</Text>
                                            </View>
                                            <Text style={styles.summaryCardContent}>{parsedSummary.overview}</Text>
                                        </View>
                                    )}
                                    {(parsedSummary.sections || []).map((section, idx) => (
                                        <View key={idx} style={styles.summaryCard}>
                                            <View style={styles.summaryCardHeaderRow}>
                                                <FontAwesome name={section.icon} size={14} color="#A4A4AD" style={styles.summaryCardIcon} />
                                                <Text style={styles.summaryCardLabel}>{section.label}</Text>
                                            </View>
                                            {section.rows ? (
                                                section.rows.map((row, ri) => (
                                                    <View key={ri} style={styles.summaryCardRow}>
                                                        <Text style={styles.summaryCardRowLabel}>{row.label}</Text>
                                                        <Text
                                                            style={[
                                                                styles.summaryCardRowValue,
                                                                String(row.label).toLowerCase().includes('deposit') && styles.summaryCardRowValueSmall,
                                                            ]}
                                                        >
                                                            {row.value}
                                                        </Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text style={styles.summaryCardContent}>{section.content}</Text>
                                            )}
                                        </View>
                                    ))}
                                    {parsedSummary.next_steps && (
                                        <View style={styles.summaryNextStepsSection}>
                                            <View style={styles.summaryCardHeaderRow}>
                                                <FontAwesome name="arrow-right" size={14} color="#34E65A" style={styles.summaryCardIcon} />
                                                <Text style={[styles.summaryCardLabel, styles.summaryNextStepsLabel]}>Next Steps</Text>
                                            </View>
                                            <View style={styles.summaryNextStepsCard}>
                                                <Text style={styles.summaryNextStepsContent}>{parsedSummary.next_steps}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text style={styles.summaryText}>{chatSummary}</Text>
                            )}
                        </ScrollView>
                    </Animated.View>
                </View>
            )}

            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.inputIconButton} onPress={toggleRentalModal}>
                    <FontAwesome name="paperclip" size={20} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIconButton} onPress={toggleFlagModal}>
                    <FontAwesome name={isFlagged ? 'flag' : 'flag-o'} size={20} color={isFlagged ? '#E94068' : '#555'} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Message"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSubmitEditing={sendMessage}
                    blurOnSubmit={false}
                    returnKeyType="send"
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <FontAwesome name="send" size={16} color="#fff" />
                </TouchableOpacity>
            </View>

            {isAskAiModalVisible && (
                <View style={styles.aiModalOverlay}>
                    <View style={styles.aiModalContent}>
                        <View style={styles.aiModalHeader}>
                            <View style={styles.aiModalTitleGroup}>
                                <AvatarOrb color="blue" size="sm" shape="squircle" blinking style={styles.aiModalOrb} />
                                <Text style={styles.aiModalTitle}>Ask AI</Text>
                            </View>
                            <TouchableOpacity style={styles.aiModalCloseButton} onPress={() => setAskAiModalVisible(false)}>
                                <FontAwesome name="times" size={14} color="#666A70" />
                            </TouchableOpacity>
                        </View>
                        {aiAnswer !== '' && isAiAnswerPlaceholder && (
                            <Text style={styles.placeholderNotice}>Currently using hardcoded placeholder LLM guardrails.</Text>
                        )}
                        <View style={styles.aiQuestionRow}>
                            <TextInput
                                style={[styles.aiQuestionInput, isAskingAi && styles.aiQuestionInputDisabled]}
                                placeholder="E.g. What is the tenant asking for?"
                                placeholderTextColor="#6F7075"
                                value={aiQuestion}
                                onChangeText={setAiQuestion}
                                onKeyPress={handleAiQuestionKeyPress}
                                multiline={false}
                                numberOfLines={1}
                                blurOnSubmit={false}
                                editable={!isAskingAi}
                            />
                            <TouchableOpacity
                                style={[styles.aiAskIconButton, isAskingAi && styles.aiAskIconButtonDisabled]}
                                onPress={askAiQuestion}
                                disabled={isAskingAi}
                            >
                                <FontAwesome name="arrow-up" size={14} color={isAskingAi ? '#C8C8CC' : '#FFFFFF'} />
                            </TouchableOpacity>
                        </View>
                        {(submittedAiQuestion !== '' || aiAnswer !== '' || isAskingAi) && (
                            <ScrollView
                                style={styles.aiAnswerContainer}
                                contentContainerStyle={styles.aiAnswerContentContainer}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                                persistentScrollbar={true}
                            >
                                {submittedAiQuestion !== '' && (
                                    <View style={styles.aiAskedQuestionContainer}>
                                        <View style={styles.aiSectionLabelRow}>
                                            <FontAwesome name="user" size={10} color="#AEAEB2" />
                                            <Text style={styles.aiAskedQuestionLabel}>YOU ASKED</Text>
                                        </View>
                                        <Text style={styles.aiAskedQuestionText}>{submittedAiQuestion}</Text>
                                    </View>
                                )}
                                {submittedAiQuestion !== '' && <View style={styles.aiSectionDivider} />}
                                <View style={styles.aiResponseSection}>
                                    <View style={styles.aiSectionLabelRow}>
                                        <FontAwesome name="magic" size={10} color="#3D7DD8" />
                                        <Text style={styles.aiAnswerTitle}>AI RESPONSE</Text>
                                    </View>
                                    {isAskingAi && aiAnswer === '' ? (
                                        <View style={styles.aiLoadingRow}>
                                            <ActivityIndicator size="small" color="#3D7DD8" />
                                            <Text style={styles.aiLoadingText}>AI is thinking...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.aiAnswerBody}>{renderAiAnswer()}</View>
                                    )}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={isAttachmentModalVisible}
                onRequestClose={toggleAttachmentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Attachment</Text>
                            {/* Close button */}
                            <TouchableOpacity onPress={toggleAttachmentModal}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.rentalOfferOption}>
                            <TouchableOpacity onPress={toggleRentalModal} style={styles.rentalOfferButton}>
                                <Image source={sendRentalOfferIcon} style={styles.rentalIcon} />
                                <Text>Rental Offer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isRentalModalVisible}
                onRequestClose={closeRentalModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.rentalOfferModal}>
                        {/* Header */}
                        <View style={styles.rentalOfferModalHeader}>
                            <View style={styles.rentalOfferTitleRow}>
                                <FontAwesome name="file-text-o" size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.rentalOfferModalTitle}>Send rental offer</Text>
                            </View>
                            <TouchableOpacity onPress={closeRentalModal}>
                                <FontAwesome name="times" size={18} color="#aaa" />
                            </TouchableOpacity>
                        </View>

                        {/* Disclaimer */}
                        <Text style={styles.rentalOfferDisclaimer}>
                            Once accepted, a rental agreement is created and you can start collecting rent.
                        </Text>

                        {/* Row 1: Rent / Deposit */}
                        {(() => {
                            const priceInvalid = rentalPrice.trim() !== '' && (isNaN(Number(rentalPrice)) || Number(rentalPrice) <= 0);
                            const depositInvalid = rentalDeposit.trim() !== '' && (isNaN(Number(rentalDeposit)) || Number(rentalDeposit) <= 0);
                            return (
                                <View style={styles.rentalOfferRow}>
                                    <View style={styles.rentalOfferFieldHalf}>
                                        <Text style={styles.rentalOfferFieldLabel}>Rent / month</Text>
                                        <View style={[styles.rentalOfferInputRow, priceInvalid && styles.rentalOfferDateInputError]}>
                                            <Text style={styles.rentalOfferCurrencyPrefix}>$</Text>
                                            <TextInput
                                                style={styles.rentalOfferInput}
                                                placeholder="0"
                                                placeholderTextColor="#666"
                                                keyboardType="numeric"
                                                returnKeyType="next"
                                                onSubmitEditing={() => depositInputRef.current?.focus()}
                                                blurOnSubmit={false}
                                                value={rentalPrice}
                                                onChangeText={setRentalPrice}
                                            />
                                            {priceInvalid && (
                                                <View style={styles.rentalOfferAmountWarnIcon}>
                                                    <FontAwesome name="exclamation-circle" size={14} color="#F59E0B" />
                                                </View>
                                            )}
                                        </View>
                                        {priceInvalid && (
                                            <View style={styles.rentalOfferTooltip}>
                                                <Text style={styles.rentalOfferTooltipText}>Must be a positive number</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.rentalOfferFieldHalf}>
                                        <Text style={styles.rentalOfferFieldLabel}>Deposit</Text>
                                        <View style={[styles.rentalOfferInputRow, depositInvalid && styles.rentalOfferDateInputError]}>
                                            <Text style={styles.rentalOfferCurrencyPrefix}>$</Text>
                                            <TextInput
                                                ref={depositInputRef}
                                                style={styles.rentalOfferInput}
                                                placeholder="0"
                                                placeholderTextColor="#666"
                                                keyboardType="numeric"
                                                returnKeyType="next"
                                                onSubmitEditing={() => leaseStartInputRef.current?.focus()}
                                                blurOnSubmit={false}
                                                value={rentalDeposit}
                                                onChangeText={setRentalDeposit}
                                            />
                                            {depositInvalid && (
                                                <View style={styles.rentalOfferAmountWarnIcon}>
                                                    <FontAwesome name="exclamation-circle" size={14} color="#F59E0B" />
                                                </View>
                                            )}
                                        </View>
                                        {depositInvalid && (
                                            <View style={styles.rentalOfferTooltip}>
                                                <Text style={styles.rentalOfferTooltipText}>Must be a positive number</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Row 2: Lease start / Lease end */}
                        {(() => {
                            const startDate = parseDMY(rentalDate);
                            const endDate = parseDMY(leaseExpiry);
                            const startInvalid = rentalDate.trim() !== '' && !startDate;
                            const endInvalid = leaseExpiry.trim() !== '' && !endDate;
                            const endBeforeStart = !endInvalid && !startInvalid && startDate && endDate && endDate <= startDate;
                            const startMsg = startInvalid ? 'Invalid date format' : null;
                            const endMsg = endInvalid ? 'Invalid date format' : endBeforeStart ? 'Must be after lease start' : null;
                            return (
                                <View style={styles.rentalOfferRow}>
                                    <View style={styles.rentalOfferFieldHalf}>
                                        <Text style={styles.rentalOfferFieldLabel}>Lease start</Text>
                                        <View style={styles.rentalOfferDateWrapper}>
                                            <TextInput
                                                ref={leaseStartInputRef}
                                                style={[styles.rentalOfferDateInput, startInvalid && styles.rentalOfferDateInputError]}
                                                placeholder="DD-MM-YYYY"
                                                placeholderTextColor="#666"
                                                returnKeyType="next"
                                                onSubmitEditing={() => leaseEndInputRef.current?.focus()}
                                                blurOnSubmit={false}
                                                value={rentalDate}
                                                onChangeText={setRentalDate}
                                            />
                                            {startMsg && (
                                                <View style={styles.rentalOfferWarnIcon}>
                                                    <FontAwesome name="exclamation-circle" size={14} color="#F59E0B" />
                                                </View>
                                            )}
                                        </View>
                                        {startMsg && (
                                            <View style={styles.rentalOfferTooltip}>
                                                <Text style={styles.rentalOfferTooltipText}>{startMsg}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.rentalOfferFieldHalf}>
                                        <Text style={styles.rentalOfferFieldLabel}>Lease end</Text>
                                        <View style={styles.rentalOfferDateWrapper}>
                                            <TextInput
                                                ref={leaseEndInputRef}
                                                style={[styles.rentalOfferDateInput, (endInvalid || endBeforeStart) && styles.rentalOfferDateInputError]}
                                                placeholder="DD-MM-YYYY"
                                                placeholderTextColor="#666"
                                                returnKeyType="send"
                                                onSubmitEditing={handleSendOffer}
                                                value={leaseExpiry}
                                                onChangeText={setLeaseExpiry}
                                            />
                                            {endMsg && (
                                                <View style={styles.rentalOfferWarnIcon}>
                                                    <FontAwesome name="exclamation-circle" size={14} color="#F59E0B" />
                                                </View>
                                            )}
                                        </View>
                                        {endMsg && (
                                            <View style={styles.rentalOfferTooltip}>
                                                <Text style={styles.rentalOfferTooltipText}>{endMsg}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Offer Preview */}
                        {(() => {
                            const price = Number(rentalPrice);
                            const deposit = Number(rentalDeposit);
                            const start = parseDMY(rentalDate);
                            const end = parseDMY(leaseExpiry);
                            const hasPrice = rentalPrice.trim() !== '' && !isNaN(price);
                            const hasDeposit = rentalDeposit.trim() !== '' && !isNaN(deposit);
                            const hasValidDates = start && end && end > start;
                            const months = hasValidDates ? Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44)) : 0;
                            const durationLabel = months === 12 ? '1 year' : `${months} month${months !== 1 ? 's' : ''}`;
                            const fmtDate = (d) => {
                                if (!d || isNaN(d)) return '';
                                return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
                            };
                            const fmtCurrency = (n) => n.toLocaleString('en-SG');
                            const showPreview = hasPrice || hasDeposit || hasValidDates;
                            if (!showPreview) return null;
                            return (
                                <View style={styles.rentalOfferPreview}>
                                    <Text style={styles.rentalOfferPreviewLabel}>OFFER PREVIEW</Text>
                                    {(hasPrice || hasDeposit) && (
                                        <Text style={styles.rentalOfferPreviewLine}>
                                            {hasPrice ? `$${fmtCurrency(price)}/mo` : ''}
                                            {hasPrice && hasDeposit ? ' · ' : ''}
                                            {hasDeposit ? `$${fmtCurrency(deposit)} deposit` : ''}
                                        </Text>
                                    )}
                                    {hasValidDates && (
                                        <Text style={styles.rentalOfferPreviewLine}>
                                            {fmtDate(start)} – {fmtDate(end)} ({durationLabel})
                                        </Text>
                                    )}
                                </View>
                            );
                        })()}

                        {/* Send button */}
                        <TouchableOpacity
                            style={[styles.rentalOfferSendButton, !canSendOffer && styles.rentalOfferSendButtonDisabled]}
                            onPress={handleSendOffer}
                            disabled={!canSendOffer}
                        >
                            <Text style={styles.rentalOfferSendButtonText}>Send offer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isFlagModalVisible}
                onRequestClose={closeFlagModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Report User?</Text>
                            {/* Close button */}
                            <TouchableOpacity onPress={closeFlagModal} disabled={isReportingUser}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>This will send the chat history to an admin for review.</Text>
                        <View style={styles.buttonAlignment}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={closeFlagModal}
                                disabled={isReportingUser}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, isReportingUser && styles.disabledConfirmButton]}
                                onPress={flagUser}
                                disabled={isReportingUser}
                            >
                                {isReportingUser ? (
                                    <View style={styles.reportingContent}>
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                        <Text style={styles.reportingButtonText}>Reporting...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.whiteButtonText}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={!!userReportNotificationMessage}
                statusBarTranslucent
            >
                <View style={styles.notificationOverlay} pointerEvents="none">
                    <View style={styles.notificationCard}>
                        <View style={styles.notificationIconBox}>
                            <Image source={notificationBellIcon} style={styles.notificationIcon} />
                        </View>
                        <Text style={styles.notificationText}>{userReportNotificationMessage}</Text>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isPaymentModalVisible}
                onRequestClose={togglePaymentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.payModalContent}>
                        {/* Header */}
                        <View style={styles.payModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome name="lock" size={14} color="#4ADE80" />
                                <Text style={styles.payModalTitle}>Pay deposit</Text>
                            </View>
                            <TouchableOpacity onPress={togglePaymentModal}>
                                <FontAwesome name="times" size={18} color="#aaa" />
                            </TouchableOpacity>
                        </View>

                        {/* Deposit summary row */}
                        <View style={styles.payDepositRow}>
                            <View>
                                <Text style={styles.payDepositLabel}>RENTAL DEPOSIT</Text>
                                <Text style={styles.payDepositAmount}>
                                    ${rental?.depositPrice ? Number(rental.depositPrice).toLocaleString('en-SG') : '0'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Image source={visa} style={styles.payCardLogo} />
                                <Image source={master} style={styles.payCardLogo} />
                            </View>
                        </View>

                        {/* Card number */}
                        <Text style={styles.payFieldLabel}>Card number</Text>
                        <View style={[styles.payInputRow, cardNumberError ? styles.payInputError : null]}>
                            <TextInput
                                style={styles.payInput}
                                placeholder="1234 5678 9012 3456"
                                placeholderTextColor="#555"
                                keyboardType="numeric"
                                maxLength={19}
                                value={cardNumber}
                                onChangeText={(t) => {
                                    const digits = t.replace(/\D/g, '').slice(0, 16);
                                    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
                                    setCardNumber(formatted);
                                    setCardNumberError('');
                                }}
                                onBlur={() => {
                                    const digits = cardNumber.replace(/\s/g, '');
                                    if (digits.length > 0 && digits.length !== 16) setCardNumberError('Must be 16 digits');
                                }}
                            />
                            <FontAwesome name="credit-card" size={16} color="#555" />
                        </View>
                        {cardNumberError ? <Text style={styles.payFieldError}>{cardNumberError}</Text> : null}

                        {/* Expiry + CVV row */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.payFieldLabel}>Expiry</Text>
                                <View style={[styles.payInputRow, cardExpiryError ? styles.payInputError : null]}>
                                    <TextInput
                                        style={styles.payInput}
                                        placeholder="MM / YY"
                                        placeholderTextColor="#555"
                                        keyboardType="numeric"
                                        maxLength={7}
                                        value={cardExpiry}
                                        onChangeText={(t) => {
                                            const digits = t.replace(/\D/g, '').slice(0, 4);
                                            const formatted = digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
                                            setCardExpiry(formatted);
                                            setCardExpiryError('');
                                        }}
                                        onBlur={() => {
                                            const digits = cardExpiry.replace(/\D/g, '');
                                            if (digits.length === 0) return;
                                            if (digits.length !== 4) { setCardExpiryError('Use MM/YY format'); return; }
                                            const mm = parseInt(digits.slice(0, 2), 10);
                                            const yy = parseInt(digits.slice(2), 10);
                                            if (mm < 1 || mm > 12) { setCardExpiryError('Invalid month'); return; }
                                            const now = new Date();
                                            const expiry = new Date(2000 + yy, mm - 1, 1);
                                            if (expiry < new Date(now.getFullYear(), now.getMonth(), 1)) setCardExpiryError('Card has expired');
                                        }}
                                    />
                                </View>
                                {cardExpiryError ? <Text style={styles.payFieldError}>{cardExpiryError}</Text> : null}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.payFieldLabel}>CVV</Text>
                                <View style={[styles.payInputRow, cardCvvError ? styles.payInputError : null]}>
                                    <TextInput
                                        style={styles.payInput}
                                        placeholder="•••"
                                        placeholderTextColor="#555"
                                        keyboardType="numeric"
                                        maxLength={3}
                                        secureTextEntry
                                        value={cardCvv}
                                        onChangeText={(t) => {
                                            setCardCvv(t.replace(/\D/g, '').slice(0, 3));
                                            setCardCvvError('');
                                        }}
                                        onBlur={() => {
                                            if (cardCvv.length > 0 && cardCvv.length !== 3) setCardCvvError('Must be 3 digits');
                                        }}
                                    />
                                    <FontAwesome name="question-circle" size={16} color="#555" />
                                </View>
                                {cardCvvError ? <Text style={styles.payFieldError}>{cardCvvError}</Text> : null}
                            </View>
                        </View>

                        {/* Pay button */}
                        {(() => {
                            const digitsOnly = cardNumber.replace(/\s/g, '');
                            const expiryDigits = cardExpiry.replace(/\D/g, '');
                            const validCard = digitsOnly.length === 16;
                            const validCvv = cardCvv.length === 3;
                            let validExpiry = false;
                            if (expiryDigits.length === 4) {
                                const mm = parseInt(expiryDigits.slice(0, 2), 10);
                                const yy = parseInt(expiryDigits.slice(2), 10);
                                if (mm >= 1 && mm <= 12) {
                                    const now = new Date();
                                    validExpiry = new Date(2000 + yy, mm - 1, 1) >= new Date(now.getFullYear(), now.getMonth(), 1);
                                }
                            }
                            const canPay = validCard && validExpiry && validCvv;
                            const depositLabel = rental?.depositPrice ? `$${Number(rental.depositPrice).toLocaleString('en-SG')}` : '';
                            const buttonDisabled = !canPay || isPayingDeposit;
                            return (
                                <>
                                    <TouchableOpacity
                                        style={[styles.payButton, buttonDisabled && styles.payButtonDisabled]}
                                        onPress={buttonDisabled ? null : handlePaymentAndAccept}
                                        disabled={buttonDisabled}
                                    >
                                        {isPayingDeposit ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <FontAwesome name="lock" size={13} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={styles.payButtonText}>Pay {depositLabel}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <Text style={styles.paySecureNote}>Your payment is encrypted and secure.</Text>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isPaymentSuccessfulModalVisible}
                onRequestClose={toggleSuccessfulPaymentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModalContent}>
                        {/* Green check circle */}
                        <View style={styles.successIconCircle}>
                            <FontAwesome name="check" size={22} color="#4ADE80" />
                        </View>

                        <Text style={styles.successTitle}>Deposit paid</Text>
                        <Text style={styles.successDate}>
                            {new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>

                        {/* Receipt rows */}
                        <View style={styles.successDivider} />
                        <View style={styles.successRow}>
                            <Text style={styles.successRowLabel}>Amount paid</Text>
                            <Text style={styles.successRowValue}>
                                ${rental?.depositPrice ? Number(rental.depositPrice).toLocaleString('en-SG') : '0'}
                            </Text>
                        </View>
                        <View style={styles.successRow}>
                            <Text style={styles.successRowLabel}>Rental offer</Text>
                            <Text style={[styles.successRowValue, { color: '#4ADE80' }]}>Accepted</Text>
                        </View>
                        <View style={styles.successRow}>
                            <Text style={styles.successRowLabel}>Lease starts</Text>
                            <Text style={styles.successRowValue}>
                                {rental?.rentalDate
                                    ? new Date(rental.rentalDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '—'}
                            </Text>
                        </View>
                        <View style={styles.successDivider} />

                        <Text style={styles.successNote}>
                            You can track your rental and payment history in your inbox.
                        </Text>

                        <TouchableOpacity style={styles.successDoneButton} onPress={toggleSuccessfulPaymentModal}>
                            <Text style={styles.successDoneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#fff',
    },
    // Header row 1
    nameHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F0F0',
        marginRight: 10,
    },
    headerAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#101820',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    headerAvatarInitials: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    header: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#101820',
    },
    reviewsLink: {
        marginLeft: 8,
        alignSelf: 'center',
        justifyContent: 'center',
    },
    reviews: {
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        color: '#101820',
    },
    // Header row 2
    headerActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 6,
    },
    aiSummaryButton: {
        flex: 1,
        backgroundColor: '#101820',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    aiSummaryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    thinDivider: {
        height: 1,
        backgroundColor: '#ddd',
        width: '100%',
        marginBottom: 8,
    },
    // Chat list
    chatList: {
        flex: 1,
    },
    chatListContent: {
        paddingVertical: 8,
    },
    // Message groups
    groupContainer: {
        marginBottom: 14,
    },
    bubbleRowLeft: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 3,
    },
    bubbleRowRight: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 3,
    },
    avatarCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#555',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        flexShrink: 0,
    },
    avatarInitials: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    avatarSpacer: {
        width: 38,
    },
    bubble: {
        maxWidth: '72%',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    bubbleOther: {
        backgroundColor: '#F0F0F0',
        borderBottomLeftRadius: 4,
    },
    bubbleSelf: {
        backgroundColor: '#2563EB',
        borderBottomRightRadius: 4,
    },
    bubbleText: {
        fontSize: 15,
        color: '#101820',
        lineHeight: 21,
    },
    bubbleTextSelf: {
        color: '#fff',
    },
    groupTimestamp: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    groupTimestampLeft: {
        marginLeft: 38,
    },
    groupTimestampRight: {
        textAlign: 'right',
    },
    // Loading
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
    // Delivery status
    messageText: {
        marginTop: 5,
        fontSize: 14,
        color: '#101820',
    },
    sendingText: {
        marginTop: 4,
        color: '#999',
        fontSize: 11,
    },
    failedMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    errorIcon: {
        width: 16,
        height: 16,
        marginRight: 4,
    },
    failedMessageText: {
        color: '#E94068',
        fontSize: 11,
        fontWeight: '700',
        marginRight: 8,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: '#F1F1F1',
    },
    retryIcon: {
        width: 12,
        height: 12,
        marginRight: 3,
    },
    retryText: {
        color: '#101820',
        fontSize: 11,
        fontWeight: '700',
    },
    // Input bar
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fafafa',
        gap: 6,
    },
    inputIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        backgroundColor: '#F0F0F0',
        fontSize: 15,
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#101820',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 24,
        height: 24,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    aiModalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 120,
        elevation: 120,
    },
    aiModalContent: {
        alignItems: 'stretch',
        maxHeight: '80%',
        flexDirection: 'column',
        alignSelf: 'stretch',
        marginHorizontal: 24,
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 0,
        paddingVertical: 0,
        overflow: 'hidden',
    },
    aiAskButton: {
        backgroundColor: '#000',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    aiModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8EC',
    },
    aiModalTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiModalOrb: {
        width: 28,
        height: 28,
        marginRight: 8,
    },
    aiModalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    aiModalCloseButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E1E2E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    rentalIcon:{
        width: 50,
        height: 50,
        marginBottom: 10,
    },
    rentalOfferOption: {
        justifyContent:'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    rentalOfferButton: {
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 20,
    },
    modalDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
    },
    placeholderNotice: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 12,
        color: '#F5C451',
    },
    summaryText: {
        fontSize: 15,
        lineHeight: 24,
        textAlign: 'left',
        width: '100%',
        marginBottom: 10,
        color: '#F1F1F4',
    },
    summaryOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        elevation: 100,
    },
    summarySheetBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.52)',
        zIndex: 100,
        elevation: 100,
    },
    summarySheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#2B2B2E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingHorizontal: 24,
        paddingBottom: 0,
        paddingTop: 18,
        height: Dimensions.get('window').height * 0.75,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
        zIndex: 101,
        elevation: 101,
    },
    summarySheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#8D8D92',
        alignSelf: 'center',
        marginBottom: 18,
    },
    summarySheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 22,
        borderBottomWidth: 1,
        borderBottomColor: '#3B3B3F',
        marginBottom: 8,
    },
    summarySheetTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    summaryAiIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#203A61',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    summarySheetTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F5F5F7',
        letterSpacing: -0.3,
    },
    summarySheetScroll: {
        flex: 1,
    },
    summarySheetScrollContent: {
        paddingBottom: 44,
    },
    summaryCard: {
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#39393D',
    },
    summaryCardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryCardIcon: {
        marginRight: 10,
    },
    summaryCardLabel: {
        fontSize: 15,
        fontWeight: '800',
        color: '#A4A4AD',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    summaryCardContent: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '700',
        color: '#F0F0F3',
    },
    summaryCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 6,
        gap: 12,
    },
    summaryCardRowLabel: {
        fontSize: 18,
        lineHeight: 24,
        color: '#AAAAB0',
        flex: 1,
    },
    summaryCardRowValue: {
        fontSize: 18,
        lineHeight: 24,
        fontWeight: '800',
        color: '#F4F4F6',
        flex: 1.15,
        textAlign: 'right',
        flexShrink: 1,
    },
    summaryCardRowValueSmall: {
        fontSize: 15,
        lineHeight: 21,
        color: '#C8C8CE',
    },
    summaryNextStepsSection: {
        paddingTop: 18,
    },
    summaryNextStepsLabel: {
        color: '#34E65A',
    },
    summaryNextStepsCard: {
        backgroundColor: 'rgba(50, 215, 75, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(50, 215, 75, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    summaryNextStepsContent: {
        fontSize: 18,
        lineHeight: 27,
        fontWeight: '800',
        color: '#ECECEF',
    },
    aiQuestionInput: {
        flex: 1,
        height: 40,
        maxHeight: 40,
        backgroundColor: '#F1F1F3',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        lineHeight: 18,
        color: '#101820',
    },
    aiQuestionInputDisabled: {
        backgroundColor: '#e8e8e8',
        color: '#555',
    },
    aiQuestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8EC',
        gap: 8,
    },
    aiAskIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1C1C1E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiAskIconButtonDisabled: {
        backgroundColor: '#F1F1F3',
    },
    aiAnswerContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 0,
        maxHeight: Dimensions.get('window').height * 0.48,
    },
    aiAnswerContentContainer: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 28,
    },
    aiAskedQuestionContainer: {
        marginBottom: 12,
    },
    aiResponseSection: {
        marginTop: 12,
    },
    aiSectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 5,
    },
    aiSectionDivider: {
        height: 0.5,
        backgroundColor: '#F2F2F2',
        width: '100%',
    },
    aiAskedQuestionLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#AEAEB2',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    aiAskedQuestionText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        color: '#000000',
    },
    aiAnswerTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#3D7DD8',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    aiAnswerText: {
        fontSize: 13,
        lineHeight: 20,
        color: '#000000',
    },
    aiAnswerBody: {
        gap: 8,
    },
    aiAnswerParagraph: {
        fontSize: 13,
        lineHeight: 20,
        color: '#000000',
    },
    aiAnswerDetailRow: {
        paddingVertical: 2,
    },
    aiAnswerDetailLabel: {
        fontSize: 10,
        lineHeight: 14,
        fontWeight: '700',
        color: '#6F7075',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    aiAnswerDetailValue: {
        fontSize: 13,
        lineHeight: 20,
        color: '#111111',
    },
    aiLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 2,
    },
    aiLoadingText: {
        fontSize: 13,
        lineHeight: 20,
        color: '#5F6368',
        fontWeight: '500',
    },
    infoContainer: {
        marginBottom: 10,
        alignItems: 'center',
        borderRadius: 10,
        paddingVertical: 20,
        paddingHorizontal: 20,
        width: 280,
        borderColor: '#000',
        borderWidth: 3,
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    descriptionText:{
        fontSize: 14,
    },
    longBlackButton:{
        width: 280,
        borderWidth: 3,
        borderRadius: 10,
        backgroundColor: '#000',
    },
    whiteButtonText:{
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    confirmButton:{
        backgroundColor: '#000',
        width: 120,
        borderWidth: 3,
        borderRadius: 15,
    },
    disabledConfirmButton: {
        opacity: 0.82,
    },
    reportingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    reportingButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    cancelButton:{
        width: 120,
        borderWidth: 3,
        borderRadius: 15,
    },
    buttonText:{
        fontSize: 15,
        textAlign: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        fontWeight:'bold',
    },
    buttonAlignment:{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
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
    rentalOfferContainer:{
        padding: 20,
        flexDirection: 'column'
    },
    rentalOfferBubbleShell: {
        width: '88%',
        maxWidth: 420,
    },
    rentalOfferMessage: {
        width: '100%',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(60, 60, 67, 0.18)',
        borderWidth: 0.5,
        borderRadius: 16,
        marginTop: 5,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    rentalOfferHeader: {
        backgroundColor: '#1c1c1e',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    rentalOfferHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    rentalOfferIconBadge: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#444447',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rentalOfferHeaderTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        flexShrink: 1,
    },
    rentalOfferStatusPill: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    rentalOfferStatusPillNew: {
        backgroundColor: 'rgba(10, 132, 255, 0.18)',
    },
    rentalOfferStatusPillPending: {
        backgroundColor: 'rgba(255, 159, 10, 0.18)',
    },
    rentalOfferStatusPillAccepted: {
        backgroundColor: '#DDF8E5',
    },
    rentalOfferStatusText: {
        fontSize: 13,
        fontWeight: '800',
    },
    rentalOfferStatusTextNew: {
        color: '#0a84ff',
    },
    rentalOfferStatusTextPending: {
        color: '#FF9F0A',
    },
    rentalOfferStatusTextAccepted: {
        color: '#1C8E3A',
    },
    rentalOfferBody: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    rentalOfferDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEF',
        gap: 12,
    },
    rentalOfferDetailRowLast: {
        borderBottomWidth: 0,
    },
    rentalOfferDetailLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rentalOfferDetailIcon: {
        width: 18,
        textAlign: 'center',
        marginRight: 10,
    },
    rentalOfferDetailLabel: {
        color: '#85858C',
        fontSize: 16,
        fontWeight: '700',
    },
    rentalOfferDetailValue: {
        color: '#1C1C20',
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'right',
        flexShrink: 1,
    },
    rentalOfferRentValue: {
        color: '#0a84ff',
        fontSize: 19,
    },
    rentalOfferTitle: {
        fontWeight: 'bold',
    },
    pendingAcceptanceBox: {
        backgroundColor: '#F1F1F5',
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingAcceptanceText: {
        color: '#85858C',
        fontSize: 16,
        fontWeight: '800',
    },
    pendingStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF9F0A',
        marginRight: 10,
    },
    acceptedStatusDot: {
        backgroundColor: '#32D74B',
    },
    rentalOfferActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
    },
    pendingRejectBox: {
        flex: 1,
        backgroundColor: '#F1F1F5',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
    },
    pendingAcceptBox: {
        flex: 2,
        backgroundColor: '#0a84ff',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
    },
    rejectText: {
        color: '#1C1C20',
        fontSize: 14,
        fontWeight: '800',
    },
    acceptText: {
        fontSize: 14,
        fontWeight: '800',
        color: 'white'
    },
    paymentMethodsContainer:{
        flexDirection: 'row',
        marginBottom: 10,
    },
    paymentModalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'flex-start',
    },
    paymentLargeInput: {
        width: 280,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 14,
    },
    paymentSmallInput:{
        width: 135,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginRight: 10,
        marginBottom: 15,
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
    },
    star:{
        width: 15,
        height: 15,
        marginBottom: 9,
        marginRight: 5,
    },
    rating:{
        fontWeight: 'bold',
        marginBottom: 8,
    },
    reviews:{
        fontSize: 14,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        color: '#101820',
    },
    emptyMessageContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyMessageText: {
        color: '#666',
        fontStyle: 'italic',
    },

    // Rental offer modal (new design)
    rentalOfferModal: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginTop: 'auto',
        marginBottom: 40,
    },
    rentalOfferModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    rentalOfferTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rentalOfferModalTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    rentalOfferDisclaimer: {
        color: '#aaa',
        fontSize: 13,
        marginBottom: 18,
        lineHeight: 19,
    },
    rentalOfferRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    rentalOfferFieldHalf: {
        flex: 1,
    },
    rentalOfferFieldLabel: {
        color: '#ccc',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    rentalOfferInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 44,
    },
    rentalOfferCurrencyPrefix: {
        color: '#fff',
        fontSize: 15,
        marginRight: 4,
    },
    rentalOfferInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
    },
    rentalOfferDateWrapper: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    rentalOfferDateInput: {
        flex: 1,
        backgroundColor: '#2C2C2E',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingRight: 32,
        height: 44,
        color: '#fff',
        fontSize: 14,
    },
    rentalOfferDateInputError: {
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    rentalOfferWarnIcon: {
        position: 'absolute',
        right: 10,
        padding: 4,
    },
    rentalOfferAmountWarnIcon: {
        marginLeft: 4,
        padding: 4,
    },
    rentalOfferTooltip: {
        backgroundColor: '#3A2E00',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginTop: 4,
    },
    rentalOfferTooltipText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '600',
    },
    rentalOfferPreview: {
        backgroundColor: '#2A3A5C',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    rentalOfferPreviewLabel: {
        color: '#6B8FD4',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    rentalOfferPreviewLine: {
        color: '#C5D8FF',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    rentalOfferSendButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    rentalOfferSendButtonDisabled: {
        backgroundColor: '#3B82F6',
        opacity: 0.35,
    },
    rentalOfferSendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    /* ── Pay deposit modal ── */
    payModalContent: {
        width: '88%',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    payModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    payModalTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    payDepositRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
    },
    payDepositLabel: {
        color: '#888',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    payDepositAmount: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
    },
    payCardLogo: {
        width: 38,
        height: 24,
        resizeMode: 'contain',
        borderRadius: 4,
    },
    payFieldLabel: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 14,
    },
    payInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    payInputError: {
        borderColor: '#EF4444',
    },
    payInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
    },
    payFieldError: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: 4,
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        height: 52,
        marginTop: 24,
    },
    payButtonDisabled: {
        backgroundColor: '#3B82F6',
        opacity: 0.35,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    paySecureNote: {
        color: '#666',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 10,
    },

    /* ── Payment success modal ── */
    successModalContent: {
        width: '80%',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    successIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#14532D',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    successDate: {
        color: '#888',
        fontSize: 13,
        marginBottom: 20,
    },
    successDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 12,
    },
    successRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 6,
    },
    successRowLabel: {
        color: '#888',
        fontSize: 16,
    },
    successRowValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    successNote: {
        color: '#aaa',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
        lineHeight: 20,
    },
    successDoneButton: {
        width: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successDoneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ChatsScreen2;
