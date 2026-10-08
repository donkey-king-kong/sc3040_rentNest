import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const NavigationBar = ({ style }) => {
  const router = useRouter();
  const pathname = usePathname();

  const getIconStyle = (route) => ({
    ...styles.icon,
    color: pathname.includes(route) ? '#000' : '#888',
  });

  return (
    <View style={[styles.navbar, style]}>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/HomeScreen')}>
        <FontAwesome name="search" style={getIconStyle('HomeScreen')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/InboxScreen')}>
        <FontAwesome name="inbox" style={getIconStyle('InboxScreen')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/CreateListingScreen')}>
        <FontAwesome name="plus-circle" style={getIconStyle('CreateListingScreen')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/ChatsScreen')}>
        <FontAwesome name="comments" style={getIconStyle('ChatsScreen')} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/ProfileScreen')}>
        <FontAwesome name="user" style={getIconStyle('ProfileScreen')} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  navItem: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 25,
    lineHeight: 25,
    color: '#888',
    textAlign: 'center',
  },
});

export default NavigationBar;
