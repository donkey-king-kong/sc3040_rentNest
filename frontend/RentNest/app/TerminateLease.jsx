import React, {useEffect, useState} from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRoute } from '@react-navigation/native';
import {useLocalSearchParams, useRouter} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {jwtDecode} from "jwt-decode";
import axios from "axios";
import {API_BASE_URL} from "../config/api";

const TerminateLease = () => {
  const route = useRoute();
  const router = useRouter();
  const { rentalId } = route.params;
  const { refresh } = useLocalSearchParams();
  const [user, setUser] = useState({
    userID: 1,
    name: 'Loading...',
    email: 'Loading...',
    contact: 'Loading...',
    photoURL: 'https://www.hindustantimes.com/static-content/1y/cricket-logos/players/virat-kohli.png',
  });
  const [rental, setRental] = useState([]);
  const [Loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState('refund');
  const [amount, setAmount] = useState('');

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('LandingScreen');
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
      setUser({
        userID: response.data.userID,
        name: response.data.name,
        email: response.data.email,
        contact: response.data.contact,
        photoURL: response.data.photoURL || 'https://www.hindustantimes.com/static-content/1y/cricket-logos/players/virat-kohli.png'
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigation.navigate('LandingScreen');
    }
  };

  console.log("rentalid", rentalId)
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

  console.log("partner",rental.tenantUserID)

  const submitTerminationRequest = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found!');
        navigation.replace('/LoginScreen');
        return;
      }
      console.log("amount", amount);
      const rentalResponse = await axios.post(`${API_BASE_URL}/api/requests/terminationrequest/${rentalId}/${amount}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log("Request response", rentalResponse.data);
      router.push(`/ChatsScreen2?partnerUserId=${rental.tenantUserID}&currentUser=${user.userID}`)
      setLoading(false);
    } catch (error) {
      console.error('Error sending requests:', error);
    }
  }

  useEffect(() => {
    fetchUserData();
    getRental(rentalId);
  }, [refresh]);

  const handleOptionPress = (option) => {
    setSelectedOption(option);
  };

  /*// Simulated data for the Luxury Condo listing
  const rental = {
    listingID: 1,
    tenant: {
        userID: 2,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        contact: '87654321',
        photoURL: 'https://cassette.sphdigital.com.sg/image/thinkchina/04b91218bc0285c56a5da20f6a1b27bca6773c55bf62b503785e7ad1f6391e4e',
    },
    deposit_price: '1000',
    rental_price: '3500',
    lease_expiry: "2025-10-06T12:00:00Z",
    status: 'pending',
    paymentID: 1,
  };*/

  if (Loading) {
    return (
        <View style={[styles.screen, styles.content]}>
          <Text>Loading chat history...</Text>
        </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Terminate Lease</Text>
      <Text style={styles.description}>
        Please fill in the terms as agreed in your rental agreement. The tenant will have to accept the termination for it to proceed.
      </Text>

      {/* Option Buttons */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            selectedOption === 'refund' ? styles.selectedOption : null,
          ]}
          onPress={() => handleOptionPress('refund')}
        >
          <Text style={styles.optionText}>Refund Tenant</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={[
            styles.optionButton,
            selectedOption === 'collect' ? styles.selectedOption : null,
          ]}
          onPress={() => handleOptionPress('collect')}
        >
          <Text style={styles.optionText}>Collect Payment</Text>
        </TouchableOpacity> */}
      </View>

      {/* Amount Label */}
      <Text style={styles.amountLabel}>Amount:</Text>

      {/* Amount Input */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={submitTerminationRequest}>
        <Text style={styles.submitButtonText}>Submit Termination</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
    marginVertical: 10,
    color: '#666',
  },
  optionsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: '#e0e0e0',
  },
  optionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  amountLabel: {
    fontSize: 16,
    marginVertical: 10,
  },
  input: {
    width: '100%', // Adjusting the size of the text box
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 30,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  submitButton: {
    position: 'absolute',
    bottom: 30, // Fixed at the bottom
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: '#000',
    borderRadius: 5,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16, // Smaller text size for the button
    fontWeight: 'bold',
  },
});

export default TerminateLease;
