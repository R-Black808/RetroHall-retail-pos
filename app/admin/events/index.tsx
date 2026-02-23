import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Plus, Calendar, MapPin, Pencil } from 'lucide-react-native';

interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  max_attendees: number;
  game_type: string;
  image_url: string | null;
}

export default function AdminEventsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);

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
      const admin = !!data;
      setIsAdmin(admin);
      if (admin) {
        await fetchEvents();
      }
    } catch (e) {
      console.error('Error checking admin:', e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      setEvents((data as any) || []);
    } catch (e) {
      console.error('Error fetching events:', e);
      Alert.alert('Error', 'Failed to fetch events');
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
            fetchEvents();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete event');
          }
        },
      },
    ]);
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Events</Text>
            <Text style={styles.subtitle}>Create and edit events</Text>
          </View>

          <Pressable style={styles.addBtn} onPress={() => router.push('/admin/events/new')}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>New</Text>
          </Pressable>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No events yet.</Text>
              <Text style={styles.emptySub}>Tap “New” to create your first event.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const when = new Date(item.date);
            const whenText = isNaN(when.getTime()) ? item.date : when.toLocaleString();

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => router.push({ pathname: '/admin/events/[id]', params: { id: item.id } })}
                    >
                      <Pencil size={18} color="#A020F0" />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(item.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Calendar size={16} color="#A020F0" />
                  <Text style={styles.metaText}>{whenText}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={16} color="#A020F0" />
                  <Text style={styles.metaText}>{item.location}</Text>
                </View>

                <Text style={styles.metaPill}>Type: {item.game_type || 'TCG'} • Max: {item.max_attendees ?? 16}</Text>
              </View>
            );
          }}
        />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#999', marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A020F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  addBtnText: { color: '#fff', fontWeight: '800' },
  empty: { marginTop: 30, padding: 20, backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 1, borderColor: '#2A2A44' },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptySub: { color: '#999', marginTop: 6 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2A2A44', marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '900', flex: 1, paddingRight: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#11111F', borderWidth: 1, borderColor: '#2A2A44' },
  deleteText: { color: '#FF5C5C', fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  metaText: { color: '#CFCFEA', flex: 1 },
  metaPill: { color: '#AFAFDA', marginTop: 10 },
});
