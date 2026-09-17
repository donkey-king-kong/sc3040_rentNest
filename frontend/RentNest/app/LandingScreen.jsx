import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import Button from '../components/button'; // Ensure this path is correct
import { useRouter } from 'expo-router';

const LandingScreen = () => {
  const router = useRouter();

  const handleSignUp = () => {
    router.push('/SignUpScreen'); // Ensure this matches the name exactly
  };

  const handleLogin = () => {
    router.push('/LoginScreen'); // Ensure this matches the name exactly
  };

  return (
    <ImageBackground
      source={require('../assets/images/LandingScreenImg.jpeg')} // Replace with your image path
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>RentNest</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Sign Up"
            onPress={handleSignUp}
            backgroundColor="#222222" // Sign Up button color
            textColor="#FFFFFF" // Sign Up button text color
          />
          <Button
            title="Log In"
            onPress={handleLogin}
            backgroundColor="#FFFFFF" // Log In button color
            textColor="#000000" // Log In button text color
          />
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between', // Space between title and buttons
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay for better text visibility
    width: '100%',
    paddingTop: 100, // Adjust as necessary to position your title
    paddingBottom: 50, // Add padding to the bottom for spacing
  },
  title: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 50, // Increase margin to push buttons lower
  },
  buttonContainer: {
    width: '100%', // Full width for button container
    alignItems: 'center', // Center buttons in the container
    marginBottom: 30, // Additional margin to push buttons lower
  },
});

export default LandingScreen;
