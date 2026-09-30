import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const NavigationBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const getIconStyle = (route) => ({
    ...styles.icon,
    color: pathname.includes(route) ? '#000' : '#888',
  });

  return (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={() => router.push('/HomeScreen')}>
        <FontAwesome name="search" style={getIconStyle('HomeScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/InboxScreen')}>
        <FontAwesome name="inbox" style={getIconStyle('InboxScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/CreateListingScreen')}>
        <FontAwesome name="plus-circle" style={getIconStyle('CreateListingScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/ChatsScreen')}>
        <FontAwesome name="comments" style={getIconStyle('ChatsScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/ProfileScreen')}>
        <FontAwesome name="user" style={getIconStyle('ProfileScreen')} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15, // Increased padding for a bigger footer
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  icon: {
    fontSize: 25, // Icon size
    color: '#888', // Default color (dimmed)
  },
});

export default NavigationBar;
