import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Order } from '@/lib/supabase';
import { router } from 'expo-router';

const statuses = ['all', 'pending', 'paid', 'fulfilled', 'cancelled', 'refunded'] as const;

export default function AdminOrdersList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<(typeof statuses)[number]>('pending');
  const [search, setSearch] = useState('');

  const statusFilter = useMemo(() => status, [status]);

  useEffect(() => {
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (isAdmin) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, statusFilter]);

  const checkAdmin = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    } catch (e) {
      console.error('Admin check error:', e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      setOrders((data as any) || []);
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const s = search.trim().toLowerCase();
    return orders.filter((o) => o.id.toLowerCase().includes(s) || o.user_id.toLowerCase().includes(s));
  }, [orders, search]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#A020F0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>Admin Access Required</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Pressable onPress={fetchOrders}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by order/user id"
          placeholderTextColor="#666"
          style={styles.search}
        />
        <View style={styles.statusRow}>
          {statuses.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[styles.chip, status === s && styles.chipActive]}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/admin/orders/${item.id}`)}>
            <LinearGradient colors={['#11111F', '#0A0014']} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>#{item.id.slice(0, 8)}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.meta}>User: {item.user_id.slice(0, 8)}…</Text>
              <Text style={styles.meta}>Total: ${Number(item.total).toFixed(2)}</Text>
              <Text style={styles.meta}>Placed: {new Date(item.created_at).toLocaleString()}</Text>
            </LinearGradient>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No orders found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  refresh: { color: '#A020F0', fontWeight: '800' },
  filters: { paddingHorizontal: 16, paddingBottom: 10 },
  search: {
    backgroundColor: '#11111F',
    borderWidth: 1,
    borderColor: '#2A2A44',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#A020F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: '#A020F0' },
  chipText: { color: '#A020F0', fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A44',
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontWeight: '900' },
  status: { color: '#00E5FF', fontWeight: '900' },
  meta: { color: '#AAA', marginTop: 6, fontWeight: '700' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#999', fontWeight: '800' },
});
