import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase, Order } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const statusLabel = (s: string) => {
  switch (s) {
    case 'pending':
      return 'Pending';
    case 'paid':
      return 'Paid';
    case 'fulfilled':
      return 'Fulfilled';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return s;
  }
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user?.id) {
      setLoading(false);
      setOrders([]);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    Alert.alert('Cancel order?', 'This will cancel your request if it has not been fulfilled.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: async () => {
          try {
            // Fetch items so we can restore stock best-effort
            const { data: items, error: itemsError } = await supabase
              .from('order_items')
              .select('product_id, quantity')
              .eq('order_id', orderId);
            if (itemsError) throw itemsError;

            const { error: updErr } = await supabase
              .from('orders')
              .update({ status: 'cancelled' })
              .eq('id', orderId)
              .eq('user_id', user?.id);
            if (updErr) throw updErr;

            // Restore stock for each item (best-effort)
            if (items && items.length) {
              for (const it of items as any[]) {
                try {
                  const { data: p } = await supabase
                    .from('products')
                    .select('stock_qty')
                    .eq('id', it.product_id)
                    .maybeSingle();
                  const current = Number((p as any)?.stock_qty ?? 0);
                  await supabase
                    .from('products')
                    .update({ stock_qty: current + Number(it.quantity ?? 0) })
                    .eq('id', it.product_id);
                } catch {
                  // ignore
                }
              }
            }

            Alert.alert('Cancelled', 'Your order was cancelled.');
            fetchOrders();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Unable to cancel order');
          }
        },
      },
    ]);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Pressable onPress={fetchOrders}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/orders/${item.id}`)}>
            <LinearGradient colors={['#11111F', '#0A0014']} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>Order</Text>
                <Text style={styles.status}>{statusLabel(item.status)}</Text>
              </View>
              <Text style={styles.meta}>${Number(item.total).toFixed(2)}</Text>
              <Text style={styles.meta}>Placed: {new Date(item.created_at).toLocaleString()}</Text>

              {item.status === 'pending' ? (
                <Pressable style={styles.cancelBtn} onPress={() => cancelOrder(item.id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              ) : null}
            </LinearGradient>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No orders yet.</Text>
            <Pressable onPress={() => router.push('/(tabs)/shop')} style={styles.shopBtn}>
              <Text style={styles.shopText}>Go to Shop</Text>
            </Pressable>
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
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF286A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: { color: '#FF286A', fontWeight: '900' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#999', fontWeight: '800', marginBottom: 10 },
  shopBtn: { borderWidth: 1, borderColor: '#A020F0', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  shopText: { color: '#A020F0', fontWeight: '900' },
});
