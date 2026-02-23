import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, Users } from 'lucide-react-native';

type ReservationRow = {
  id: string;
  user_id: string;
  event_id: string | null;
  reservation_date: string;
  time_slot: string;
  party_size: number;
  status: 'active' | 'cancelled';
  created_at: string;
};

export default function ReservationsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReservationRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('table_reservations')
        .select('*')
        .eq('user_id', user!.id)
        .order('reservation_date', { ascending: true });
      if (error) throw error;
      setItems((data ?? []) as any);
    } catch (e: any) {
      console.error('Reservations fetch error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (reservationId: string) => {
    Alert.alert('Cancel reservation', 'Cancel this reservation?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('table_reservations')
              .update({ status: 'cancelled' })
              .eq('id', reservationId)
              .eq('user_id', user!.id);
            if (error) throw error;
            fetchReservations();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to cancel');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn}>
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>My Reservations</Text>
        <Pressable
          onPress={() => router.push('/reservations/new')}
          style={styles.newBtn}
          hitSlop={10}>
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#A020F0" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No reservations yet</Text>
              <Text style={styles.emptySub}>Book a table for board games or D&D.</Text>
              <Pressable onPress={() => router.push('/reservations/new')} style={styles.cta}>
                <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.ctaGrad}>
                  <Text style={styles.ctaText}>Reserve a Table</Text>
                </LinearGradient>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.card}>
              <View style={styles.row}>
                <Calendar size={16} color="#00E5FF" strokeWidth={2} />
                <Text style={styles.cardText}>{new Date(item.reservation_date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.row}>
                <Clock size={16} color="#00E5FF" strokeWidth={2} />
                <Text style={styles.cardText}>{item.time_slot}</Text>
              </View>
              <View style={styles.row}>
                <Users size={16} color="#00E5FF" strokeWidth={2} />
                <Text style={styles.cardText}>Party size: {item.party_size}</Text>
              </View>

              <View style={styles.bottomRow}>
                <Text style={[styles.status, item.status === 'cancelled' && styles.statusCancelled]}>
                  {item.status.toUpperCase()}
                </Text>
                {item.status === 'active' && (
                  <Pressable onPress={() => cancelReservation(item.id)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </LinearGradient>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014' },
  topBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  newBtn: {
    borderWidth: 1,
    borderColor: '#A020F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A1144' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  status: { color: '#00E5FF', fontWeight: '900', fontSize: 11 },
  statusCancelled: { color: '#666' },
  cancelText: { color: '#FF286A', fontWeight: '900' },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  emptySub: { color: '#AAA', marginTop: 6, textAlign: 'center' },
  cta: { borderRadius: 12, overflow: 'hidden', marginTop: 14, width: '100%' },
  ctaGrad: { paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontWeight: '900' },
});
