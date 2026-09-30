import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Modal, TextInput, ScrollView} from 'react-native';
import {useLocalSearchParams, useRouter} from "expo-router";
import { FontAwesome } from '@expo/vector-icons';

// Import Icons
import sendIcon from '../assets/images/send.jpg';
import flag from "../assets/images/chatflag.jpg";
import paperclip from "../assets/images/paperclip.jpg"
import sendRentalOfferIcon from "../assets/images/sendRentalOffer.jpg"
import x from "../assets/images/x.jpg"
import confirmation from "../assets/images/confirmation.png"
import redFlag from "../assets/images/flag.png";
import visa from "../assets/images/visa.jpg";
import master from "../assets/images/master.jpg";
import amex from "../assets/images/amex.jpg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {API_BASE_URL} from "../config/api";
import MorphingInfinity from '../components/MorphingInfinity';

const errorIcon = require('../assets/images/errorIcon.png');
const retryButtonIcon = require('../assets/images/retryButton.png');
const profilePic = require('../assets/images/chatProfilePic.jpg');

const ChatsScreen2 = () => {
    const router = useRouter();
    const { partnerUserId, currentUser} = useLocalSearchParams();
    const [chat, setChat] = useState([]);
    const [rental, setRental] = useState([]);
    const [request, setRequest] = useState([]);
    const [partner, setPartner] = useState([]);
    const [listing, setListing] = useState([]);
    const [rentalPrice, setRentalPrice] = useState('');
    const [rentalDeposit, setRentalDeposit] = useState('');
    const [leaseExpiry, setLeaseExpiry] = useState('');
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false)
    const [isRentalModalVisible, setRentalModalVisible] = useState(false)
    const [isFlagModalVisible, setFlagModalVisible] = useState(false)
    const [isUserReportedModalVisible, setUserReportedModalVisible] = useState(false)
    const [newMessage, setNewMessage] = useState('');
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false)
    const [isPaymentSuccessfulModalVisible, setPaymentSuccessfulModalVisible] = useState(false)
    const [Loading, setLoading] = useState(true);
    const summaryScrollRef = useRef(null);
    const [isSummaryModalVisible, setSummaryModalVisible] = useState(false);
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

    const flagUser = async () => {
        try{
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            const flaggedResponse = await axios.put(`${API_BASE_URL}/api/users/setFlag/${partnerUserId}/1`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (flaggedResponse.status === 200){
                toggleUserReportedModal();
                await getPartner();
            }else{
                console.error('Flagging failed:', flaggedResponse.data)
            }
        }
        catch (error) {
            console.error('Error flagging partner:', error);
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

    const getChatSummary = async () => {
        const cacheKey = getChatSummaryCacheKey();

        if (summaryCache?.key === cacheKey) {
            setSummaryError('');
            setChatSummary(summaryCache.summary);
            setSummaryPlaceholder(summaryCache.placeholder);
            setSummaryModalVisible(true);
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
            setSummaryModalVisible(true);
        } catch (error) {
            console.error('Error generating chat summary:', error);
            setSummaryError('Unable to generate chat summary right now.');
            setSummaryPlaceholder(false);
            setSummaryModalVisible(true);
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
            setAiQuestion('');
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

    const sendRentalOffer = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            console.log("listingid", listing)
            if (!token) {
                console.log('No token found!');
                router.replace('/LoginScreen');
                return;
            }
            if (rentalPrice.trim() !== '' && rentalDeposit.trim() !== '' && leaseExpiry.trim() !== ''){
                const rentalBody = {
                    rentalDTO: {
                        listingID: listing[0],
                        tenantUserID: partnerUserId,
                        rentalPrice: rentalPrice,
                        depositPrice: rentalDeposit,
                        rentalDate: new Date().toISOString(),
                        leaseExpiry: leaseExpiry,
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
                    await getConversation();
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
                tenantUserID: currentUser,
                rentalPrice: rental.rentalPrice,
                depositPrice: rental.depositPrice,
                rentalDate: new Date().toISOString(),
                leaseExpiry: rental.leaseExpiry,
                paymentHistory: "First payment made on " + new Date().toISOString(),
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
                leaseExpiry: new Date().toISOString(),
                paymentHistory: "First payment made on " + new Date().toISOString(),
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
    await handlePaymentSubmit(); // Call the payment submit function
    await acceptRentalOffer(); // Call the rental offer acceptance function
    toggleSuccessfulPaymentModal();
    await getConversation(); // Refresh the conversation data
};

    useEffect(() => {
        getConversation();
    }, [refresh]);

    // Toggle attachment modal visibility
    const toggleAttachmentModal = () => {
        setAttachmentModalVisible(!isAttachmentModalVisible);
    };

    // Toggle rental modal visibility
    const toggleRentalModal = async () => {
        setAttachmentModalVisible(false);
        await getListing();
        setRentalModalVisible(!isRentalModalVisible);
    }
    const closeRentalModal = () => {
        setRentalModalVisible(false);
    };

    // Toggle flag modal visibility
    const toggleFlagModal = () => {
        setFlagModalVisible(!isFlagModalVisible);
    };
    const closeFlagModal = () => {
        setFlagModalVisible(false);
    }

    // Toggle successfully reported modal visibility
    const toggleUserReportedModal = () => {
        setFlagModalVisible(false);
        setUserReportedModalVisible(!isUserReportedModalVisible);
    };

    // Toggle payment modal visibility
    const togglePaymentModal = () => {
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
            const lastMsg = group[group.length - 1];
            const timestamp = new Date(lastMsg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Special card messages (rental offer / termination)
            if (rentalIdExists || requestIdExists) {
                return (
                    <View key={first.messageID} style={styles.groupContainer}>
                        <View style={styles.bubbleRowLeft}>
                            <AvatarCircle photoURL={isUser ? first.senderPhotoURL : partner.photoURL} name={isUser ? 'You' : partner.name} size={30} style={{ marginRight: 8 }} />
                            <View style={[styles.bubble, styles.bubbleOther, { maxWidth: '80%' }]}>
                                {rentalIdExists && (
                                    <View style={styles.rentalOfferMessage}>
                                        <Text style={styles.rentalOfferTitle}>Rental Offer</Text>
                                        <Text style={styles.messageText}>Rent: ${rental.rentalPrice} Per Month</Text>
                                        <Text style={styles.messageText}>Rental Deposit: ${rental.depositPrice}</Text>
                                        <Text style={styles.messageText}>Lease until {new Date(rental.leaseExpiry).toLocaleDateString()}</Text>
                                        {isOwner ? (
                                            <View style={styles.pendingAcceptanceBox}>
                                                <Text style={styles.pendingAcceptanceText}>{isAccepted ? 'Accepted' : 'Pending Acceptance'}</Text>
                                            </View>
                                        ) : rental.status === 'active' ? (
                                            <View style={styles.pendingAcceptanceBox}>
                                                <Text style={styles.pendingAcceptanceText}>Accepted</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.buttonAlignment}>
                                                <TouchableOpacity style={styles.pendingRejectBox}>
                                                    <Text style={styles.rejectText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={togglePaymentModal} style={styles.pendingAcceptBox}>
                                                    <Text style={styles.acceptText}>Accept</Text>
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
                        <Text style={styles.groupTimestamp}>{timestamp}</Text>
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

    const summaryTextToDisplay = summaryError || chatSummary;
    const shouldScrollSummary = summaryTextToDisplay.length > 650;
    const shouldScrollAiAnswer = aiAnswer.length > 650;

    return (
        <View style={styles.container}>
            {/* Header row 1: back + avatar + name + Reviews */}
            <View style={styles.nameHeaderContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={18} color="#101820" />
                </TouchableOpacity>
                <AvatarCircle photoURL={partner.photoURL} name={partner.name} size={36} style={{ marginRight: 10 }} />
                <Text style={styles.header}>{partner.name}</Text>
                <TouchableOpacity
                    style={styles.reviewsLink}
                    onPress={() => router.push({ pathname: '/UserReviewsScreen', params: { userId: partnerUserId } })}
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

            <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
                {renderMessage()}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.inputIconButton} onPress={toggleAttachmentModal}>
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

            <Modal
                animationType="slide"
                transparent={true}
                visible={isSummaryModalVisible}
                onRequestClose={() => setSummaryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.aiModalContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>AI Chat Summary</Text>
                            <TouchableOpacity onPress={() => setSummaryModalVisible(false)}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        {isSummaryPlaceholder && (
                            <Text style={styles.placeholderNotice}>Currently using hardcoded placeholder summary.</Text>
                        )}
                        <ScrollView
                            ref={summaryScrollRef}
                            style={[styles.aiResponseScroll, shouldScrollSummary && styles.aiResponseScrollLong]}
                            scrollEnabled={shouldScrollSummary}
                            onLayout={() => summaryScrollRef.current?.scrollTo({ y: 0, animated: false })}
                        >
                            <Text style={styles.summaryText}>{summaryError || chatSummary}</Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isAskAiModalVisible}
                onRequestClose={() => setAskAiModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.aiModalContent]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ask AI About This Chat</Text>
                            <TouchableOpacity onPress={() => setAskAiModalVisible(false)}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        {aiAnswer !== '' && isAiAnswerPlaceholder && (
                            <Text style={styles.placeholderNotice}>Currently using hardcoded placeholder LLM guardrails.</Text>
                        )}
                        <Text style={styles.modalDescription}>Ask questions related to this rental conversation only.</Text>
                        <TextInput
                            style={styles.aiQuestionInput}
                            placeholder="E.g. What is the tenant asking for?"
                            value={aiQuestion}
                            onChangeText={setAiQuestion}
                            onKeyPress={handleAiQuestionKeyPress}
                            multiline={true}
                            blurOnSubmit={false}
                        />
                        <View style={styles.longBlackButton}>
                            <TouchableOpacity onPress={askAiQuestion} disabled={isAskingAi}>
                                <Text style={styles.whiteButtonText}>{isAskingAi ? ' Asking AI... ' : ' Ask AI '}</Text>
                            </TouchableOpacity>
                        </View>
                        {aiAnswer !== '' && (
                            <View style={styles.aiAnswerContainer}>
                                {submittedAiQuestion !== '' && (
                                    <View style={styles.aiAskedQuestionContainer}>
                                        <Text style={styles.aiAskedQuestionLabel}>You Asked</Text>
                                        <Text style={styles.aiAskedQuestionText}>{submittedAiQuestion}</Text>
                                    </View>
                                )}
                                <Text style={styles.aiAnswerTitle}>{getAiAnswerTitle()}</Text>
                                <ScrollView
                                    style={[styles.aiResponseScroll, shouldScrollAiAnswer && styles.aiResponseScrollLong]}
                                    scrollEnabled={shouldScrollAiAnswer}
                                >
                                    <Text style={styles.summaryText}>{aiAnswer}</Text>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

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
                    <View style={styles.paymentModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Rental Offer</Text>
                            {/* Close button */}
                            <TouchableOpacity onPress={closeRentalModal}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>
                            This sends an offer to your potential tenant to accept or reject. Please make sure that all legal documents are in order before sending the offer. Once accepted, you can start collecting rent payments.
                        </Text>
                        {/* Rent Per Month */}
                        <TextInput
                            style={styles.infoContainer}
                            placeholder="Rent Per Month"
                            keyboardType="numeric"
                            value={rentalPrice}
                            onChangeText={setRentalPrice}
                        />
                        <TextInput
                            style={styles.infoContainer}
                            placeholder="Rental Deposit Required"
                            keyboardType="numeric"
                            value={rentalDeposit}
                            onChangeText={setRentalDeposit}
                        />
                        <TextInput
                            style={styles.infoContainer}
                            placeholder="End of Lease Date"
                            value={leaseExpiry}
                            onChangeText={setLeaseExpiry}
                        />
                        <View style={styles.longBlackButton}>
                            <TouchableOpacity onPress={sendRentalOffer}>
                                <Text style={styles.whiteButtonText}> Send Offer </Text>
                            </TouchableOpacity>
                        </View>
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
                            <TouchableOpacity onPress={closeFlagModal}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>This will send the chat history to an admin for review.</Text>
                        <View style={styles.buttonAlignment}>
                            <View style={styles.confirmButton}>
                                <TouchableOpacity onPress={flagUser}>
                                    <Text style={styles.whiteButtonText}> Confirm </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.cancelButton}>
                                <TouchableOpacity onPress={closeFlagModal}>
                                    <Text style={styles.buttonText}> Cancel </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isUserReportedModalVisible}
                onRequestClose={toggleUserReportedModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>User Reported</Text>
                            {/* Close button */}
                            <TouchableOpacity onPress={toggleUserReportedModal}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <Image source={confirmation} style={styles.confirmationImage}/>
                        <Text style={styles.modalDescription}>An admin will review the chat history and take appropriate actions</Text>
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
                    <View style={styles.paymentModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Card Payment</Text>
                            {/* Close button */}
                            <TouchableOpacity onPress={togglePaymentModal}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>Rental Deposit</Text>
                        <View style={styles.paymentMethodsContainer}>
                            <Image source={visa} style={styles.icon}/>
                            <Image source={master} style={styles.icon}/>
                            <Image source={amex} style={styles.icon}/>
                        </View>
                        <TextInput style={styles.paymentLargeInput} placeholder="Card Number" keyboardType="numeric"/>
                        <View style={styles.row}>
                            <TextInput style={styles.paymentSmallInput} placeholder="Expiration (MM/YY)" keyboardType="numeric"/>
                            <TextInput style={styles.paymentSmallInput} placeholder="CVV" keyboardType="numeric"/>
                        </View>
                        <TextInput style={styles.paymentLargeInput} placeholder="Postal Code" keyboardType="numeric" />
                        <TextInput style={styles.paymentLargeInput} placeholder="Location" />
                        <View style={styles.longBlackButton}>
                            <TouchableOpacity onPress={handlePaymentAndAccept}>
                                <Text style={styles.whiteButtonText}> Pay ${rental?.depositPrice} and Accept Rental Offer </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isPaymentSuccessfulModalVisible}
                onRequestClose={toggleSuccessfulPaymentModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Payment Successful</Text>
                            {/* Close button */}
                            <TouchableOpacity onPress={toggleSuccessfulPaymentModal}>
                                <Image source={x} style={styles.icon}/>
                            </TouchableOpacity>
                        </View>
                        <Image source={confirmation} style={styles.confirmationImage}/>
                        <Text style={styles.modalDescription}>{new Date().toLocaleDateString()}</Text>
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
    aiModalContent: {
        alignItems: 'stretch',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
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
        marginBottom: 12,
        color: '#7A4E00',
    },
    summaryText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'left',
        width: '100%',
        marginBottom: 10,
    },
    aiResponseScroll: {
        width: '100%',
        flexGrow: 0,
    },
    aiResponseScrollLong: {
        maxHeight: 360,
    },
    aiQuestionInput: {
        width: '100%',
        backgroundColor: '#f1f1f1',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        fontSize: 14,
    },
    aiAnswerContainer: {
        width: '100%',
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 12,
        marginTop: 15,
    },
    aiAskedQuestionContainer: {
        backgroundColor: '#efefef',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    aiAskedQuestionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#666',
    },
    aiAskedQuestionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    aiAnswerTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#666',
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
    confirmationImage: {
        width: 50,
        height: 50, // Adjust the size as needed
        marginVertical: 10, // Space around the image
    },
    rentalOfferContainer:{
        padding: 20,
        flexDirection: 'column'
    },
    rentalOfferMessage: {
        width: 300,
        flexDirection: 'column',
        padding: 10,
        borderColor: '#DDDDDD',
        borderWidth: 1,
        borderRadius: 5,
        marginTop: 5,
    },
    rentalOfferTitle: {
        fontWeight: 'bold',
    },
    pendingAcceptanceBox: {
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    pendingAcceptanceText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    pendingRejectBox: {
        width: 120,
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    pendingAcceptBox: {
        width: 120,
        backgroundColor: '#000',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    rejectText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    acceptText: {
        fontSize: 14,
        fontWeight: 'bold',
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
        fontSize: 15,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        marginBottom: 10,
    },
    emptyMessageContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyMessageText: {
        color: '#666',
        fontStyle: 'italic',
    },
});

export default ChatsScreen2;
