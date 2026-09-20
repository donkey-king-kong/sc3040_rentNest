import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import NavigationBar from '../components/NavigationBar';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const emptyForm = { query: '', minPrice: '', maxPrice: '', minBeds: '', types: [] };
const historyKey = token => `recommendation-views:${jwtDecode(token).sub}`;
async function readHistory(token) {
  try {
    const value = JSON.parse(await AsyncStorage.getItem(historyKey(token)) || '[]');
    return Array.isArray(value) ? value.filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 50) : [];
  } catch { return []; }
}

export default function HomeScreen() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const applied = useRef(emptyForm);
  const activeRequest = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('recommended');

  const fetchListings = useCallback(async (filters = applied.current) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/LoginScreen'); return; }
      const numbers = {};
      for (const key of ['minPrice', 'maxPrice', 'minBeds']) {
        if (filters[key].trim()) {
          if (!/^\d+$/.test(filters[key].trim())) throw new Error('Enter whole, non-negative numbers for budget and bedrooms.');
          numbers[key] = Number(filters[key]);
        }
      }
      if (numbers.minPrice != null && numbers.maxPrice != null && numbers.minPrice > numbers.maxPrice)
        throw new Error('Minimum budget must not exceed maximum budget.');
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.RECOMMENDATIONS}`, {
        query: filters.query, ...numbers,
        types: filters.types.length ? filters.types : null,
        viewedListingIds: await readHistory(token), limit: 100,
      }, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, timeout: 15000 });
      if (!controller.signal.aborted) { applied.current = filters; setResult(response.data); }
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e.response?.status === 401 || e.response?.status === 403) {
        router.replace('/LoginScreen'); return;
      }
      setError(e.response?.status === 400 ? 'Check your search, budget and bedroom values.'
        : e.isAxiosError ? 'Could not load recommendations. Check that the backend is running, then retry.' : e.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => {
    fetchListings();
    return () => activeRequest.current?.abort();
  }, [fetchListings]));

  async function openListing(item) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const history = await readHistory(token);
        await AsyncStorage.setItem(historyKey(token), JSON.stringify([item.listingID, ...history.filter(id => id !== item.listingID)].slice(0, 50)));
      }
    } catch { /* A storage failure must not prevent viewing a listing. */ }
    router.push({ pathname: '/HomeListingScreen', params: { listingId: item.listingID } });
  }

  async function clearHistory() {
    const token = await AsyncStorage.getItem('token');
    try {
      if (token) await AsyncStorage.removeItem(historyKey(token));
      await fetchListings();
    } catch { setError('Could not clear viewing history. Please try again.'); }
  }

  const items = [...(result?.recommendations || [])];
  if (sort === 'price') items.sort((a, b) => a.price - b.price || a.listingID - b.listingID);
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find your next home</Text>
      <Text style={styles.muted}>Try “2 bedroom condo in Tampines under $3,000”. Basic search supports type, location, bedrooms and budget.</Text>
      <View style={styles.row}>
        <TextInput accessibilityLabel="Search homes" style={styles.input} placeholder="Location, postal code or search phrase" value={form.query}
          maxLength={300} onChangeText={value => update('query', value)} onSubmitEditing={() => fetchListings(form)} />
        <TouchableOpacity style={styles.button} onPress={() => fetchListings(form)}><Text style={styles.buttonText}>Search</Text></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setShowFilters(!showFilters)}><Text style={styles.link}>{showFilters ? 'Hide filters' : 'Budget, bedrooms and property type'}</Text></TouchableOpacity>
      {showFilters && <View>
        <View style={styles.row}>
          {[['minPrice', 'Min S$/month'], ['maxPrice', 'Max S$/month'], ['minBeds', 'Min bedrooms']].map(([key, label]) =>
            <TextInput key={key} accessibilityLabel={label} style={styles.input} placeholder={label} keyboardType="numeric" value={form[key]} onChangeText={value => update(key, value)} />)}
        </View>
        <View style={styles.row}>
          {['HDB', 'Condo', 'Landed'].map(type => <TouchableOpacity key={type} accessibilityRole="checkbox" accessibilityState={{ checked: form.types.includes(type) }}
            style={[styles.chip, form.types.includes(type) && styles.selected]}
            onPress={() => update('types', form.types.includes(type) ? form.types.filter(t => t !== type) : [...form.types, type])}>
            <Text>{type}</Text></TouchableOpacity>)}
          <TouchableOpacity style={styles.chip} onPress={() => { setForm(emptyForm); fetchListings(emptyForm); }}><Text>Reset</Text></TouchableOpacity>
        </View>
      </View>}
      <View style={styles.row}>
        <TouchableOpacity style={styles.chip} onPress={() => setSort(sort === 'recommended' ? 'price' : 'recommended')}><Text>Sort: {sort === 'recommended' ? 'Recommended' : 'Lowest rent'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={clearHistory}><Text>Clear viewing history</Text></TouchableOpacity>
      </View>
      <Text style={styles.muted}>Personalisation uses up to 50 recently opened homes, saved on this device for your account.</Text>
      {error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><TouchableOpacity onPress={() => fetchListings(form)}><Text style={styles.link}>Retry</Text></TouchableOpacity></View> : null}
      {loading ? <ActivityIndicator accessibilityLabel="Loading recommendations" style={{ margin: 20 }} /> : null}
      {!loading && !error && result && <FlatList data={items} keyExtractor={item => String(item.listingID)}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={<View style={{ marginVertical: 12 }}>
          <Text style={styles.heading}>{result.mode === 'personalized' ? 'Recommended for you' : 'Homes to explore'} · {result.total} matches</Text>
          <Text style={styles.muted}>Applied: {result.filters.location || 'All locations'} · {result.filters.types.join(', ') || 'All types'} · S${result.filters.minPrice ?? 0}–{result.filters.maxPrice ?? 'Any'} · {result.filters.minBeds ?? 0}+ bedrooms</Text>
          {result.notices.map(notice => <Text key={notice} style={styles.muted}>{notice}</Text>)}
          {result.total > items.length && <Text style={styles.muted}>Showing the top {items.length}. Narrow your search for more specific results.</Text>}
        </View>}
        ListEmptyComponent={<Text style={styles.heading}>No available homes match. Try a wider budget or fewer filters.</Text>}
        renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => openListing(item)}>
          {item.listingpicture ? <Image source={{ uri: item.listingpicture }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Text>No photo available</Text></View>}
          <View style={{ padding: 14 }}><Text style={styles.heading}>{item.name || 'Rental property'}</Text>
            {item.demo && <Text style={styles.muted}>Sample listing · illustrative stock photo</Text>}
            <Text>{item.summary}</Text>
            {result.mode === 'personalized' && <Text style={styles.link}>Match score: {item.score}/100</Text>}
            {item.reasons.map(reason => <Text key={reason} style={styles.muted}>• {reason}</Text>)}
          </View>
        </TouchableOpacity>} />}
      <NavigationBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 25, fontWeight: 'bold', marginBottom: 6 },
  heading: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  muted: { color: '#555', fontSize: 13, marginBottom: 6, lineHeight: 19 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8, alignItems: 'center' },
  input: { flex: 1, minWidth: 95, borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 12 },
  button: { backgroundColor: '#182c25', borderRadius: 8, padding: 13 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { color: '#205c43', marginVertical: 6, fontWeight: '600' },
  chip: { padding: 9, borderWidth: 1, borderColor: '#aaa', borderRadius: 8 },
  selected: { backgroundColor: '#d8eee0', borderColor: '#205c43' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  image: { width: '100%', height: 200 },
  placeholder: { backgroundColor: '#edf1ee', justifyContent: 'center', alignItems: 'center' },
  error: { color: '#a42020', marginVertical: 8 },
});
