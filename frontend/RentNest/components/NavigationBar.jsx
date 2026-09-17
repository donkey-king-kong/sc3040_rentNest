import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const NavigationBar = () => {
  const navigation = useNavigation();
  const currentRouteName = useNavigationState(state => {
    const route = state.routes[state.index];
    return route.name;
  });

  const getIconStyle = (route) => ({
    ...styles.icon,
    color: currentRouteName === route ? '#000' : '#888', // Dark color if active, dimmed if not
  });

  return (
    <View style={styles.navbar}>
      <TouchableOpacity onPress={() => navigation.navigate('HomeScreen')}>
        <FontAwesome name="search" style={getIconStyle('HomeScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('InboxScreen')}>
        <FontAwesome name="inbox" style={getIconStyle('InboxScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('CreateListingScreen')}>
        <FontAwesome name="plus-circle" style={getIconStyle('CreateListingScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ChatsScreen')}>
        <FontAwesome name="comments" style={getIconStyle('ChatsScreen')} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
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
