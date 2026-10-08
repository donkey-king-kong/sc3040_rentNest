import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export const LISTING_IMAGE_FALLBACK =
  'https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_338,w_600/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG';

const SANITIZER_VERSION = 'extract-url-v2';
const DEFAULT_IMAGE_WIDTH = 240;
const DEFAULT_IMAGE_HEIGHT = 160;

const getBoundaryCharCodes = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }

  return [
    value.charCodeAt(0),
    value.charCodeAt(value.length - 1),
  ];
};

export const normalizeListingImageUrl = (url) => {
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

export const optimizeListingImageUrl = (url, width = DEFAULT_IMAGE_WIDTH, height = DEFAULT_IMAGE_HEIGHT) => {
  const normalizedUrl = normalizeListingImageUrl(url);

  if (!normalizedUrl) {
    return '';
  }

  if (normalizedUrl.includes('picsum.photos/seed/')) {
    return normalizedUrl.replace(/\/\d+\/\d+(\?.*)?$/, `/${width}/${height}$1`);
  }

  if (normalizedUrl.includes('onecms-res.cloudinary.com/image/upload/')) {
    return normalizedUrl
      .replace(/h_\d+/, `h_${height}`)
      .replace(/w_\d+/, `w_${width}`);
  }

  return normalizedUrl;
};

const getImageDebugContext = ({ screen, listingId, listingName, originalUrl, imageUri, optimizedUrl, usingFallback }) => ({
  sanitizerVersion: SANITIZER_VERSION,
  screen,
  listingId,
  listingName,
  originalUrl,
  normalizedUrl: normalizeListingImageUrl(originalUrl),
  optimizedUrl,
  renderedUrl: imageUri,
  usingFallback,
  originalBoundaryCharCodes: getBoundaryCharCodes(originalUrl),
  renderedBoundaryCharCodes: getBoundaryCharCodes(imageUri),
});

const ListingImage = ({
  uri,
  style,
  screen,
  listingId,
  listingName,
  resizeMode = 'cover',
  width = DEFAULT_IMAGE_WIDTH,
  height = DEFAULT_IMAGE_HEIGHT,
}) => {
  const optimizedUrl = useMemo(() => optimizeListingImageUrl(uri, width, height), [height, uri, width]);
  const initialUri = optimizedUrl;
  const [imageUri, setImageUri] = useState(initialUri);
  const [hasTerminalError, setHasTerminalError] = useState(false);
  const usingFallback = false;

  useEffect(() => {
    setImageUri(initialUri);
    setHasTerminalError(false);
    console.log('[ListingImage] prepared', getImageDebugContext({
      screen,
      listingId,
      listingName,
      originalUrl: uri,
      imageUri: initialUri,
      optimizedUrl,
      usingFallback: initialUri === LISTING_IMAGE_FALLBACK,
    }));
  }, [initialUri, listingId, listingName, optimizedUrl, screen, uri]);

  const handleError = (error) => {
    const nativeError = error?.nativeEvent?.error || error?.nativeEvent || error?.message || 'Unknown image load error';
    console.log('[ListingImage] failed', {
      ...getImageDebugContext({
        screen,
        listingId,
        listingName,
        originalUrl: uri,
        imageUri,
        optimizedUrl,
        usingFallback,
      }),
      nativeError,
    });

    setHasTerminalError(true);
  };

  const handleLoad = () => {
    console.log('[ListingImage] loaded', getImageDebugContext({
      screen,
      listingId,
      listingName,
      originalUrl: uri,
      imageUri,
      optimizedUrl,
      usingFallback,
    }));
  };

  if (hasTerminalError || !imageUri) {
    return (
      <View style={[style, styles.unavailableContainer]}>
        <Text style={styles.unavailableText}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

const styles = StyleSheet.create({
  unavailableContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F1F1',
  },
  unavailableText: {
    color: '#777',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ListingImage;
