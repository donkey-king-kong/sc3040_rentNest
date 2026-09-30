import React, { useId, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, PeriodSelector } from './AnalyticsKit';

// Keep navigation above the scrolling panel. Changing tabs resets that panel to the top,
// while the selected period stays in the screen's state.
export default function AnalyticsLayout({ header, title, subtitle, tabs, tab, onTabChange, period, onPeriodChange, loading, error, children }) {
  const id = useId();
  const buttons = useRef([]);
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web';
  const onTabKeyDown = (event, index) => {
    const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onTabChange(tabs[next]);
    buttons.current[next]?.focus();
  };
  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          {header || <>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </>}
          <PeriodSelector value={period} onChange={onPeriodChange} loading={loading} />
          <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Analytics sections">
            {tabs.map((name, index) => (
              <Pressable key={name} onPress={() => onTabChange(name)}
                ref={(element) => { buttons.current[index] = element; }}
                nativeID={`${id}-tab-${index}`}
                {...(web ? { 'aria-selected': name === tab, 'aria-controls': `${id}-panel`, tabIndex: name === tab ? 0 : -1, onKeyDown: (event) => onTabKeyDown(event, index) } : {})}
                style={[styles.tab, width < 600 && { flexBasis: tabs.length === 4 ? '40%' : '28%' }, name === tab && styles.selectedTab]}
                accessibilityRole="tab" accessibilityState={{ selected: name === tab }}
                accessibilityLabel={`${name} tab`}>
                <Text style={[styles.tabText, name === tab && styles.selectedText]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ScrollView key={tab} nativeID={`${id}-panel`}
          {...(web ? { role: 'tabpanel', 'aria-labelledby': `${id}-tab-${tabs.indexOf(tab)}` } : {})}
          style={styles.panel} contentContainerStyle={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.ink },
  subtitle: { fontSize: 14, color: COLORS.inkSecondary, marginTop: 4, marginBottom: 16 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { flexGrow: 1, minWidth: 80, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, backgroundColor: COLORS.card },
  selectedTab: { backgroundColor: COLORS.ink },
  tabText: { fontSize: 14, color: COLORS.inkSecondary, fontWeight: '600' },
  selectedText: { color: COLORS.surface },
  panel: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  error: { color: COLORS.error, marginBottom: 12 },
});
