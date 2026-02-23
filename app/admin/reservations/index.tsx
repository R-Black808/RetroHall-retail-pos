import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Filter, Users, Table2, CircleCheck, CircleX } from 'lucide-react-native';

type ReservationRow = {
  id: string;
  user_id: string;
  event_id: string | null;
  reservation_date: string;
  time_slot: string;
  party_size: number;
  table_number?: number | null;
  status: string;
  notes?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  events?: { title: string } | null;
};

type ProfileMini = { id: string; email: string | null; display_name: string | null };

export default function AdminReservationsIndex() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileMini>>({});

  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'completed' | 'no_show'>('all');

  useEffect(() => {
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const checkAdmin = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      setIsAdmin(!!data);
      if (data) await fetchReservations();
    } catch (e: any) {
      console.error('Admin check error:', e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      let q = supabase
        .from('table_reservations')
        .select('*, events(title)')
        .order('reservation_date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (dateFilter.trim()) q = q.eq('reservation_date', dateFilter.trim());
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as any as ReservationRow[];
      setItems(rows);

      // Fetch user profiles (best effort)
      const uniqueUserIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      if (uniqueUserIds.length) {
        const { data: profs, error: profErr } = await supabase
          .from('user_profiles')
          .select('id,email,display_name')
          .in('id', uniqueUserIds);
        if (!profErr && profs) {
          const map: Record<string, ProfileMini> = {};
          for (const p of profs as any) map[p.id] = p;
          setProfiles(map);
        }
      }
    } catch (e: any) {
      console.error('Reservations fetch error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const todayString = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const refresh = async () => {
    if (!isAdmin) return;
    await fetchReservations();
  };

  if (loading && !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#A020F0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Admin Access Required</Text>
          <Text style={styles.errorSub}>You don’t have permission to view reservations.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn}>
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Reservations</Text>
        <Pressable onPress={refresh} hitSlop={10} style={styles.topBtn}>
          <Filter size={20} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <Calendar size={16} color="#00E5FF" strokeWidth={2} />
          <TextInput
            value={dateFilter}
            onChangeText={setDateFilter}
            placeholder={`Filter date (YYYY-MM-DD) e.g. ${todayString}`}
            placeholderTextColor="#666"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => {
              setDateFilter(todayString);
            }}
            style={styles.quickBtn}>
            <Text style={styles.quickBtnText}>Today</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setDateFilter('');
            }}
            style={[styles.quickBtn, styles.quickBtnAlt]}>
            <Text style={styles.quickBtnText}>All</Text>
          </Pressable>
        </View>

        <View style={styles.pills}>
          {(
            [
              ['all', 'All'],
              ['active', 'Active'],
              ['completed', 'Done'],
              ['cancelled', 'Cancelled'],
              ['no_show', 'No-show'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setStatusFilter(key)}
              style={[styles.pill, statusFilter === key && styles.pillActive]}>
              <Text style={[styles.pillText, statusFilter === key && styles.pillTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={refresh} style={styles.applyBtn}>
            <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.applyGrad}>
              <Text style={styles.applyText}>Apply</Text>
            </LinearGradient>
          </Pressable>
        </View>
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
              <Text style={styles.emptyTitle}>No reservations</Text>
              <Text style={styles.emptySub}>Try changing the date/status filters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const prof = profiles[item.user_id];
            const who = prof?.display_name || prof?.email || `${item.user_id.slice(0, 8)}…`;
            const eventTitle = item.events?.title ? ` • ${item.events.title}` : '';

            return (
              <Pressable onPress={() => router.push(`/admin/reservations/${item.id}` as any)}>
                <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardTitle}>
                        {new Date(item.reservation_date).toLocaleDateString()} • {item.time_slot}
                        {eventTitle}
                      </Text>
                      <Text style={styles.cardSub}>{who}</Text>
                    </View>
                    <View style={styles.statusWrap}>
                      <Text
                        style={[
                          styles.status,
                          item.status === 'active' && styles.statusActive,
                          item.status === 'cancelled' && styles.statusCancelled,
                          item.status === 'completed' && styles.statusDone,
                          item.status === 'no_show' && styles.statusNoShow,
                        ]}>
                        {String(item.status).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Users size={16} color="#00E5FF" strokeWidth={2} />
                    <Text style={styles.metaText}>Party: {item.party_size}</Text>
                    <View style={styles.dot} />
                    <Table2 size={16} color="#00E5FF" strokeWidth={2} />
                    <Text style={styles.metaText}>
                      Table: {item.table_number ?? '—'}
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Mark completed', 'Mark this reservation as completed?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Mark done',
                            onPress: async () => {
                              const { error } = await supabase
                                .from('table_reservations')
                                .update({ status: 'completed' })
                                .eq('id', item.id);
                              if (error) Alert.alert('Error', error.message);
                              else refresh();
                            },
                          },
                        ]);
                      }}
                      style={[styles.actionBtn, styles.actionBtnGood]}>
                      <CircleCheck size={16} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.actionText}>Done</Text>
                    </Pressable>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Cancel reservation', 'Cancel this reservation?', [
                          { text: 'Keep', style: 'cancel' },
                          {
                            text: 'Cancel',
                            style: 'destructive',
                            onPress: async () => {
                              const { error } = await supabase
                                .from('table_reservations')
                                .update({ status: 'cancelled' })
                                .eq('id', item.id);
                              if (error) Alert.alert('Error', error.message);
                              else refresh();
                            },
                          },
                        ]);
                      }}
                      style={[styles.actionBtn, styles.actionBtnBad]}>
                      <CircleX size={16} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.actionText}>Cancel</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          }}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  errorSub: { color: '#AAA', marginTop: 6, textAlign: 'center' },

  filters: { paddingHorizontal: 14, paddingBottom: 10 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A1144',
    backgroundColor: '#11111F',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontWeight: '700',
    fontSize: 12,
  },
  quickBtn: {
    borderWidth: 1,
    borderColor: '#A020F0',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#11111F',
  },
  quickBtnAlt: { borderColor: '#2A1144' },
  quickBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' },
  pill: {
    borderWidth: 1,
    borderColor: '#2A1144',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#11111F',
  },
  pillActive: { borderColor: '#A020F0' },
  pillText: { color: '#AAA', fontWeight: '900', fontSize: 11 },
  pillTextActive: { color: '#FFFFFF' },
  applyBtn: { marginLeft: 'auto', borderRadius: 999, overflow: 'hidden' },
  applyGrad: { paddingHorizontal: 14, paddingVertical: 9 },
  applyText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },

  list: { paddingHorizontal: 14, paddingBottom: 24, gap: 12 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A1144' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopLeft: { flex: 1, paddingRight: 10 },
  cardTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  cardSub: { color: '#AAA', marginTop: 4, fontWeight: '700', fontSize: 12 },
  statusWrap: { alignItems: 'flex-end' },
  status: { color: '#AAA', fontWeight: '900', fontSize: 10 },
  statusActive: { color: '#00E5FF' },
  statusCancelled: { color: '#FF286A' },
  statusDone: { color: '#4ADE80' },
  statusNoShow: { color: '#F59E0B' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2A1144', marginHorizontal: 2 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A1144',
  },
  actionBtnGood: { backgroundColor: '#0F2A1A', borderColor: '#1C5A33' },
  actionBtnBad: { backgroundColor: '#2A0F1D', borderColor: '#5A1C33' },
  actionText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },

  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  emptySub: { color: '#AAA', marginTop: 6, textAlign: 'center' },
});
