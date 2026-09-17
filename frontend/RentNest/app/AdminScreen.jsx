import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Sample image imports (update the paths according to your project structure)
const processReviewsImg = require('../assets/images/processreviews.png');
const banUserImg = require('../assets/images/banuser.jpg');
const reviewListingImg = require('../assets/images/reviewlisting.jpg');
const arrowIcon = require('../assets/images/arrow.png');

const AdminScreen = () => {
  const router = useRouter(); // Initialize router

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Management</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/ProcessReviewsScreen')}
        >
          <Image source={processReviewsImg} style={styles.buttonImage} />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Process Reviews</Text>
            <Text style={styles.buttonSubtitle}>Process flagged reviews for deletion</Text>
          </View>
          <Image source={arrowIcon} style={styles.arrowIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/BanUserScreen')}
        >
          <Image source={banUserImg} style={styles.buttonImage} />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Ban User</Text>
            <Text style={styles.buttonSubtitle}>Remove reported users from the application</Text>
          </View>
          <Image source={arrowIcon} style={styles.arrowIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/ReviewListingScreen')}
        >
          <Image source={reviewListingImg} style={styles.buttonImage} />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Review Listing</Text>
            <Text style={styles.buttonSubtitle}>Delete inappropriate listings</Text>
          </View>
          <Image source={arrowIcon} style={styles.arrowIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 2,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    //alignItems: 'center',
    backgroundColor: '#ccc',
    borderRadius: 10,
    padding: 5,
    marginVertical: 7,
    width: '90%',
    height: 100,
  },
  buttonImage: {
    width: 90,
    height: 90,
    marginRight: 15,
    borderRadius: 10, // Set border radius to half the width/height for a circular look
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  arrowIcon: {
    width: 40,
    height: 40,
  },
});

export default AdminScreen;
