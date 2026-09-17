import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Modal, TextInput} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native'; // Import useRoute for accessing route parameters
import {useLocalSearchParams, useRouter} from "expo-router";

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
import { jwtDecode } from 'jwt-decode';

const ChatsScreen2 = () => {
    const route = useRoute();
    const router = useRouter();
    const navigation = useNavigation();
    const { partnerUserId, currentUser} = route.params;
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
    const { refresh } = useLocalSearchParams();

    const getConversation = async () => {
        try {
            console.log('[getConversation] Partner User ID:', partnerUserId);
            console.log('[getConversation] Current User ID:', currentUser);

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                navigation.replace('/LoginScreen');
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
                chatData.forEach((msg) => {
                    if (msg.rentalId != null) {
                        getRental(msg.rentalId);
                    }
                    if (msg.requestId != null) {
                        console.log("requestid",msg.requestId);
                        getRequest(msg.requestId);
                    }
                });
            }
            getPartner();
            setLoading(false);
        } catch (error) {
            console.error('Error fetching conversation:', error);
            setChat([]);
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
                navigation.replace('/LoginScreen');
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
            setLoading(false);
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
                navigation.replace('/LoginScreen');
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
            setLoading(false);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    }

    const getListing = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                navigation.replace('/LoginScreen');
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
                navigation.replace('/LoginScreen');
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
            setLoading(false);
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
                navigation.replace('/LoginScreen');
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

    const sendMessage = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No token found!');
                navigation.replace('/LoginScreen');
                return;
            }
            if (newMessage.trim() !== ''){
                console.log('rentalID:', chat.rentalId || null);
                console.log('requestID:', chat.requestId || null);
                const body = {
                    receiverID: partnerUserId,
                    senderID: currentUser,
                    rentalID: chat.rentalId || null,
                    requestID: chat.requestId || null,
                    message: newMessage,
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
                    await getConversation();
                    setNewMessage('');
                }else{
                    console.log('Sending Message:', sendChatResponse.data);
                }
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }

    const sendRentalOffer = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            console.log("listingid", listing)
            if (!token) {
                console.log('No token found!');
                navigation.replace('/LoginScreen');
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
                navigation.replace('/LoginScreen');
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
                navigation.replace('/LoginScreen');
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
                navigation.replace('/LoginScreen');
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

    const renderMessage = ({ item }) => {
        if (!Array.isArray(chat) || chat.length === 0) {
            return (
                <View style={styles.emptyMessageContainer}>
                    <Text style={styles.emptyMessageText}>No messages yet. Start the conversation!</Text>
                </View>
            );
        }

        return chat.map((message) => {
            const isOwner = Number(currentUser) === Number(rental.ownerUserId);
            const isUser = Number(message.senderId) === Number(currentUser);
            const rentalIdExists = message.rentalId !== null;
            const requestIdExists = message.requestId !== null;

            if (isOwner && rentalIdExists){
                return (
                    <View key={message.messageID}>
                        <View key={message.messageID} style={styles.headerContainer}>
                            <Image source={{uri: message?.senderPhotoURL}} style={styles.avatar}/>
                            <View style={styles.rentalOfferContainer}>
                                <View style={styles.headerContainer}>
                                    <Text style={styles.sender}>{isUser ? 'You' : partner.name}</Text>
                                    <Text style={styles.date}> {new Date(message.date).toLocaleTimeString()}</Text>
                                </View>
                                <View style={styles.rentalOfferMessage}>
                                    <Text style={styles.rentalOfferTitle}>Rental Offer</Text>
                                    <Text style={styles.messageText}>Rent: ${rental.rentalPrice} Per Month</Text>
                                    <Text style={styles.messageText}>Rental Deposit: ${rental.depositPrice}</Text>
                                    <Text style={styles.messageText}>Lease until {new Date(rental.leaseExpiry).toLocaleDateString()}</Text>
                                    <View style={styles.pendingAcceptanceBox}>
                                        <Text style={styles.pendingAcceptanceText}>{isAccepted ? 'Accepted' : 'Pending Acceptance'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                );
            }
            if (!isOwner && rentalIdExists){
                return (
                    <View key={message.messageID}>
                        <View key={message.messageID} style={styles.headerContainer}>
                            <Image source={{uri: message?.senderPhotoURL}} style={styles.avatar}/>
                            <View style={styles.rentalOfferContainer}>
                                <View style={styles.headerContainer}>
                                    <Text style={styles.sender}>{isUser ? 'You' : partner.name}</Text>
                                    <Text style={styles.date}> {new Date(message.date).toLocaleTimeString()}</Text>
                                </View>
                                <View style={styles.rentalOfferMessage}>
                                    <Text style={styles.rentalOfferTitle}>Rental Offer</Text>
                                    <Text style={styles.messageText}>Rent: ${rental.rentalPrice} Per Month</Text>
                                    <Text style={styles.messageText}>Rental Deposit: ${rental.depositPrice}</Text>
                                    <Text style={styles.messageText}>Lease until {new Date(rental.leaseExpiry).toLocaleDateString()}</Text>
                                    {rental.status === "active" ? (
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
                            </View>
                        </View>
                    </View>
                );
            }
            if (isUser && requestIdExists){
                return (
                    <View key={message.messageID}>
                        <View key={message.messageID} style={styles.headerContainer}>
                            <Image source={{uri: message?.senderPhotoURL}} style={styles.avatar}/>
                            <View style={styles.rentalOfferContainer}>
                                <View style={styles.headerContainer}>
                                    <Text style={styles.sender}>{isUser ? 'You' : partner.name}</Text>
                                    <Text style={styles.date}> {new Date(message.date).toLocaleTimeString()}</Text>
                                </View>
                                <View style={styles.rentalOfferMessage}>
                                    <Text style={styles.rentalOfferTitle}>Termination of Lease Request</Text>
                                    <Text style={styles.messageText}>Amount to be refunded: ${request.refundAmount}</Text>
                                    <View style={styles.pendingAcceptanceBox}>
                                        <Text style={styles.pendingAcceptanceText}>{isTerminationAccepted ? 'Accepted' : 'Pending Acceptance'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                );
            }
            if (!isUser && requestIdExists){
                return (
                    <View key={message.messageID}>
                        <View key={message.messageID} style={styles.headerContainer}>
                            <Image source={{uri: message?.senderPhotoURL}} style={styles.avatar}/>
                            <View style={styles.rentalOfferContainer}>
                                <View style={styles.headerContainer}>
                                    <Text style={styles.sender}>{isUser ? 'You' : partner.name}</Text>
                                    <Text style={styles.date}> {new Date(message.date).toLocaleTimeString()}</Text>
                                </View>
                                <View style={styles.rentalOfferMessage}>
                                    <Text style={styles.rentalOfferTitle}>Termination of Lease Request</Text>
                                    <Text style={styles.messageText}>Amount to be refunded: ${request.refundAmount}</Text>
                                    {isTerminationAccepted ?
                                        <View style={styles.pendingAcceptanceBox}>
                                            <Text style={styles.pendingAcceptanceText}>{isTerminationAccepted ? 'Accepted' : 'Pending Acceptance'}</Text>
                                        </View> :
                                        <View style={styles.buttonAlignment}>
                                        <TouchableOpacity style={styles.pendingRejectBox}>
                                            <Text style={styles.rejectText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={acceptRequest} style={styles.pendingAcceptBox}>
                                            <Text style={styles.acceptText}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>}
                                    <Text style={styles.messageText}>The lease termination will proceed immediately if you choose to accept. Please review the termination details stated with your rental agreement.</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                );
            }
            else {
                return (
                    <View key={message.messageID} style={styles.headerContainer}>
                        <Image source={{uri: message?.senderPhotoURL}} style={styles.avatar}/>
                        <View style={styles.messageContainer}>
                            <View style={styles.headerContainer}>
                                <Text style={styles.sender}>{isUser ? 'You' : partner.name}</Text>
                                <Text style={styles.date}> {new Date(message.date).toLocaleTimeString()}</Text>
                            </View>
                            <Text style={styles.messageText}>{message.message}</Text>
                        </View>
                    </View>
                );
            }
        });
    };

    if (Loading) {
        return (
            <View style={[styles.screen, styles.content]}>
                <Text>Loading chat history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.nameHeaderContainer}>
                <Text style={styles.header}>{partner.name}</Text>
                <TouchableOpacity onPress={() => {
                    // Navigate to UserReviewsScreen while passing userId
                    navigation.navigate('UserReviewsScreen', {
                        userId: partnerUserId
                    });
                }}>
                    <Text style={styles.reviews}>Reviews</Text>
                </TouchableOpacity>
            </View>

            {/* Thin divider */}
            <View style={styles.thinDivider} />


            <FlatList
                data={chat.length > 0 ? [chat[0]] : []} // Pass first message or a placeholder
                renderItem={renderMessage}
                keyExtractor={item => item.messageID?.toString() || 'empty'}
                style={styles.chatList}
            />

            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={toggleAttachmentModal}>
                    <Image source={paperclip} style={styles.icon}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFlagModal}>
                    {isFlagged ? (
                        <Image source={redFlag} style={styles.icon} />
                    ) : (
                        <Image source={flag} style={styles.icon} />
                    )}
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Enter Message"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    />
                <TouchableOpacity onPress={sendMessage}>
                    <Image source={sendIcon} style={styles.icon}/>
                </TouchableOpacity>
            </View>

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
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        marginRight: 10,
    },
    headerContent:{
        flex: 1,
    },
    nameHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleBox: {
        backgroundColor: 'black',
        padding: 5,
        borderRadius: 5,
        marginBottom: 5,
        marginLeft: 80,
    },
    roleText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    thinDivider: {
        height: 1,
        backgroundColor: '#ddd',
        width: '100%',
        marginVertical: 10, // Keep margin around thin dividers
    },
    rentalName:{
        fontWeight: 'bold',
        fontSize:15,
    },
    rentalText:{
        fontSize: 10,
    },
    text: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    chatList: {
        flex: 1, // Take up all available space
    },
    messageContainer:{
        padding: 20,
    },
    messageText:{
        marginTop: 5,
    },
    sender:{
        fontWeight: 'bold',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 20,
    },
    date:{
        fontSize: 10,
        marginLeft: 10,
    },
    inputContainer:{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        backgroundColor: '#f9f9f9',
    },
    input: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        backgroundColor: '#f1f1f1',
    },
    icon: {
        width: 24,
        height: 24,
        marginLeft: 10,
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
