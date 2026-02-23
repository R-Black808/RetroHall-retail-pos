import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase, Order, OrderItem } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const statuses: Order['status'][] = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'];

export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  const init = async () => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle();
      const ok = !!data;
      setIsAdmin(ok);
      if (!ok) return;
      await fetchOrder();
    } catch (e) {
      console.error('Admin init error:', e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async () => {
    if (!id) return;
    const { data: o, error: oErr } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (oErr) throw oErr;
    setOrder((o as any) || null);

    const { data: it, error: itErr } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', id);
    if (itErr) throw itErr;
    setItems((it as any) || []);
  };

  const restoreStock = async () => {
    // Restore stock for each item best-effort
    for (const it of items as any[]) {
      try {
        const { data: p } = await supabase.from('products').select('stock_qty').eq('id', it.product_id).maybeSingle();
        const current = Number((p as any)?.stock_qty ?? 0);
        await supabase
          .from('products')
          .update({ stock_qty: current + Number(it.quantity ?? 0) })
          .eq('id', it.product_id);
      } catch {
        // ignore
      }
    }
  };

  const updateStatus = async (next: Order['status']) => {
    if (!order) return;

    if (next === order.status) return;

    // Confirmation for destructive status changes
    if (next === 'cancelled' || next === 'refunded') {
      Alert.alert(
        next === 'cancelled' ? 'Cancel this order?' : 'Refund this order?',
        'This will update the order status. Stock will be restored best-effort.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              await doUpdateStatus(next);
            },
          },
        ]
      );
      return;
    }

    await doUpdateStatus(next);
  };

  const doUpdateStatus = async (next: Order['status']) => {
    if (!order) return;
    try {
      setSaving(true);

      const prev = order.status;
      const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id);
      if (error) throw error;

      // If moving into cancelled/refunded from a non-cancelled state, restore stock.
      if ((next === 'cancelled' || next === 'refunded') && prev !== 'cancelled' && prev !== 'refunded') {
        await restoreStock();
      }

      await fetchOrder();
      Alert.alert('Updated', `Order status set to ${next}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to update order');
    } finally {
      setSaving(false);
    }
  };

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

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={{ color: '#fff' }}>Order not found.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: '#A020F0', fontWeight: '900' }}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order #{order.id.slice(0, 8)}</Text>
        <Pressable onPress={fetchOrder}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      <LinearGradient colors={['#11111F', '#0A0014']} style={styles.card}>
        <Text style={styles.row}>User: <Text style={styles.value}>{order.user_id}</Text></Text>
        <Text style={styles.row}>Total: <Text style={styles.value}>${Number(order.total).toFixed(2)}</Text></Text>
        <Text style={styles.row}>Placed: <Text style={styles.value}>{new Date(order.created_at).toLocaleString()}</Text></Text>
        {order.notes ? <Text style={styles.note}>Notes: {order.notes}</Text> : null}

        <View style={styles.divider} />
        <Text style={styles.section}>Status</Text>
        <View style={styles.statusRow}>
          {statuses.map((s) => (
            <Pressable
              key={s}
              disabled={saving}
              onPress={() => updateStatus(s)}
              style={[styles.chip, order.status === s && styles.chipActive]}>
              <Text style={[styles.chipText, order.status === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.divider} />
        <Text style={styles.section}>Items</Text>
        {items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{it.product?.title || it.product_id}</Text>
              <Text style={styles.itemMeta}>Qty: {it.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>${Number(it.unit_price).toFixed(2)}</Text>
          </View>
        ))}

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </LinearGradient>
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
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  refresh: { color: '#A020F0', fontWeight: '800' },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  row: { color: '#AAA', fontWeight: '800', marginTop: 6 },
  value: { color: '#fff', fontWeight: '900' },
  note: { color: '#DDD', marginTop: 10 },
  divider: { height: 1, backgroundColor: '#2A2A44', marginVertical: 14 },
  section: { color: '#fff', fontWeight: '900', marginBottom: 10 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemTitle: { color: '#fff', fontWeight: '900' },
  itemMeta: { color: '#999', fontWeight: '700', marginTop: 4 },
  itemPrice: { color: '#00E5FF', fontWeight: '900' },
  backBtn: { marginTop: 10, alignItems: 'center' },
  backText: { color: '#A020F0', fontWeight: '900' },
});
