import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function NewEventScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    dateLocal: '',
    location: '',
    max_attendees: '16',
    game_type: 'TCG',
    image_url: '',
  });

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      setIsAdmin(!!data);
    } catch (e) {
      console.error('Error checking admin:', e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (input: string) => {
    // Accept: "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM"
    const normalized = input.trim().replace(' ', 'T');
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  const handleSave = async () => {
    if (!form.title || !form.location || !form.dateLocal) {
      Alert.alert('Missing info', 'Title, date/time, and location are required.');
      return;
    }

    const d = parseDate(form.dateLocal);
    if (!d) {
      Alert.alert('Invalid date', 'Use format: YYYY-MM-DD HH:MM (example: 2026-03-01 18:30)');
      return;
    }

    const maxAttendees = Number(form.max_attendees || '16');
    if (!Number.isFinite(maxAttendees) || maxAttendees <= 0) {
      Alert.alert('Invalid max attendees', 'Enter a positive number.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('events').insert({
        title: form.title,
        description: form.description,
        date: d.toISOString(),
        location: form.location,
        max_attendees: maxAttendees,
        game_type: form.game_type || 'TCG',
        image_url: form.image_url || null,
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Event created');
      router.replace('/admin/events');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A020F0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Admin Access Required</Text>
          <Text style={styles.errorSubtext}>You don't have permission to access this page</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#11111F', '#0B0B14']} style={styles.gradient}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.title}>New Event</Text>
          <Text style={styles.subtitle}>Create an event for the community</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Friday Night Magic"
              placeholderTextColor="#666"
              value={form.title}
              onChangeText={(title) => setForm({ ...form, title })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date/Time *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD HH:MM (e.g., 2026-03-01 18:30)"
              placeholderTextColor="#666"
              value={form.dateLocal}
              onChangeText={(dateLocal) => setForm({ ...form, dateLocal })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Retro Hall - Back tables"
              placeholderTextColor="#666"
              value={form.location}
              onChangeText={(location) => setForm({ ...form, location })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Max Attendees</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="16"
              placeholderTextColor="#666"
              value={form.max_attendees}
              onChangeText={(max_attendees) => setForm({ ...form, max_attendees })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Game Type</Text>
            <TextInput
              style={styles.input}
              placeholder="TCG / Board Games / D&D"
              placeholderTextColor="#666"
              value={form.game_type}
              onChangeText={(game_type) => setForm({ ...form, game_type })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Image URL (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#666"
              value={form.image_url}
              onChangeText={(image_url) => setForm({ ...form, image_url })}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Details, rules, prizes, entry fee..."
              placeholderTextColor="#666"
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              multiline
            />
          </View>

          <Pressable style={[styles.primaryBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Create Event'}</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11111F' },
  gradient: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorSubtext: { color: '#999', fontSize: 14, textAlign: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#999', marginTop: 6, marginBottom: 18 },
  formGroup: { marginBottom: 14 },
  label: { color: '#CFCFEA', marginBottom: 6, fontWeight: '700' },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#A020F0', padding: 14, borderRadius: 14, marginTop: 6, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: { padding: 14, borderRadius: 14, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A44' },
  secondaryBtnText: { color: '#CFCFEA', fontWeight: '800' },
});
