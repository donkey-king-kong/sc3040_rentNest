import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router'; // Use useRouter for navigation

const ProcessReviewsScreen3 = () => {
  const router = useRouter(); // Get the router object

  return (
    <View style={styles.container}>
      <Text style={styles.message}>Review Deleted!</Text>
      <Image source={require('../assets/images/confirmation.png')} style={styles.confirmationImage} />

      {/* Spacer to push button to the bottom */}
      <View style={styles.spacer} />

      <TouchableOpacity
        style={styles.returnButton}
        onPress={() => router.replace('/AdminScreen')} // Navigate back to AdminScreen
      >
        <Text style={styles.buttonText}>Return to Admin Screen</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Align items to the top
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#f9f9f9',
  },
  message: {
    fontSize: 28, // Increased font size
    fontWeight: 'bold',
    marginVertical: 20, // Space between message and image
  },
  confirmationImage: {
    width: 100,
    height: 100, // Adjust the size as needed
    marginVertical: 10, // Space around the image
  },
  spacer: {
    flex: 1, // This will push the button to the bottom of the screen
  },
  returnButton: {
    backgroundColor: 'black',
    paddingVertical: 15,
    paddingHorizontal: 70,
    borderRadius: 5,
    marginBottom: 20, // Space from bottom
  },
  buttonText: {
      fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ProcessReviewsScreen3;
