import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const SANITIZER_VERSION = 'profile-url-v1';

export const normalizeProfileImageUrl = (url) => {
  if (typeof url !== 'string') {
    return '';
  }

  const cleanedUrl = url
    .trim()
    .replace(/`/g, '')
    .replace(/[\u0060\u00B4\u2018\u2019\u201B\u2032\u2035]/g, '')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();

  const httpIndex = cleanedUrl.indexOf('http://');
  const httpsIndex = cleanedUrl.indexOf('https://');
  const startIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;

  if (startIndex < 0) {
    return cleanedUrl;
  }

  const allowedUrlChar = /^[A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]$/;
  let extractedUrl = '';

  for (const char of cleanedUrl.slice(startIndex)) {
    if (!allowedUrlChar.test(char)) {
      break;
    }
    extractedUrl += char;
  }

  return extractedUrl;
};

const getInitials = (name) => {
  if (typeof name !== 'string' || !name.trim()) {
    return '?';
  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getBoundaryCharCodes = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  return [
    value.charCodeAt(0),
    value.charCodeAt(value.length - 1),
  ];
};

const getImageDebugContext = ({ screen, userId, name, role, originalUrl, imageUri }) => ({
  sanitizerVersion: SANITIZER_VERSION,
  screen,
  userId,
  name,
  role,
  originalUrl,
  normalizedUrl: normalizeProfileImageUrl(originalUrl),
  renderedUrl: imageUri,
  originalBoundaryCharCodes: getBoundaryCharCodes(originalUrl),
  renderedBoundaryCharCodes: getBoundaryCharCodes(imageUri),
});

const ProfileImage = ({
  uri,
  name,
  style,
  textStyle,
  screen,
  userId,
  role,
  resizeMode = 'cover',
}) => {
  const normalizedUrl = useMemo(() => normalizeProfileImageUrl(uri), [uri]);
  const [imageUri, setImageUri] = useState(normalizedUrl);
  const [hasImageError, setHasImageError] = useState(false);
  const initials = getInitials(name);

  useEffect(() => {
    setImageUri(normalizedUrl);
    setHasImageError(false);
    console.log('[ProfileImage] prepared', getImageDebugContext({
      screen,
      userId,
      name,
      role,
      originalUrl: uri,
      imageUri: normalizedUrl,
    }));
  }, [name, normalizedUrl, role, screen, uri, userId]);

  const handleLoad = () => {
    console.log('[ProfileImage] loaded', getImageDebugContext({
      screen,
      userId,
      name,
      role,
      originalUrl: uri,
      imageUri,
    }));
  };

  const handleError = (error) => {
    const nativeError = error?.nativeEvent?.error || error?.nativeEvent || error?.message || 'Unknown image load error';
    console.log('[ProfileImage] failed', {
      ...getImageDebugContext({
        screen,
        userId,
        name,
        role,
        originalUrl: uri,
        imageUri,
      }),
      nativeError,
    });
    setHasImageError(true);
  };

  if (!imageUri || hasImageError) {
    return (
      <View style={[styles.initialsContainer, style]}>
        <Text style={[styles.initialsText, textStyle]}>{initials}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      resizeMode={resizeMode}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

const styles = StyleSheet.create({
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6E6E6',
  },
  initialsText: {
    color: '#555',
    fontWeight: '700',
  },
});

export default ProfileImage;
