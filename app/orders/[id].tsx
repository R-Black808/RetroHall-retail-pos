import { useEffect, useMemo, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, Order, OrderItem } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const canPay = useMemo(() => {
    return !!order && order.status === 'pending' && Number(order.total) > 0;
  }, [order]);

  const fetchOrder = async () => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: o, error: oErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (oErr) throw oErr;
      setOrder((o as Order) || null);

      const { data: it, error: itErr } = await supabase
        .from('order_items')
        .select('*, product:products(*)')
        .eq('order_id', id);
      if (itErr) throw itErr;
      setItems((it as any) || []);
    } catch (e) {
      console.error('Order detail error:', e);
    } finally {
      setLoading(false);
    }
  };

  const startStripeCheckout = async () => {
    if (!id || !canPay) return;

    try {
      setPaying(true);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { order_id: id },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        console.error('Checkout invoke error:', error);
        Alert.alert('Payment error', error.message || 'Failed to start checkout.');
        return;
      }

      const url = data?.url as string | undefined;
      if (!url) {
        Alert.alert('Payment error', 'No checkout URL returned.');
        return;
      }

      // Best UX: open an auth session so Stripe can redirect back into the app via https -> myapp://
      const returnUrl = Linking.createURL('orders/return');
      await WebBrowser.openAuthSessionAsync(url, returnUrl);

      // After the user returns, the webhook may take a moment. Encourage refresh.
      Alert.alert('Payment', 'If you completed payment, tap Refresh to update your order status.');
      await fetchOrder();
    } catch (e) {
      console.error('startStripeCheckout error:', e);
      Alert.alert('Payment error', (e as Error).message || 'Something went wrong.');
    } finally {
      setPaying(false);
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
        <Text style={styles.title}>Order Details</Text>
        <Pressable onPress={fetchOrder}>
          <Text style={styles.refresh}>Refresh</Text>
        </Pressable>
      </View>

      <LinearGradient colors={['#11111F', '#0A0014']} style={styles.card}>
        <Text style={styles.row}>
          Status: <Text style={styles.value}>{order.status}</Text>
        </Text>
        <Text style={styles.row}>
          Total: <Text style={styles.value}>${Number(order.total).toFixed(2)}</Text>
        </Text>
        <Text style={styles.row}>
          Placed: <Text style={styles.value}>{new Date(order.created_at).toLocaleString()}</Text>
        </Text>
        {order.notes ? <Text style={styles.note}>Notes: {order.notes}</Text> : null}

        {order.status === 'pending' ? (
          <Text style={styles.hint}>
            Payments are processed securely with Stripe Checkout.
          </Text>
        ) : null}

        {canPay ? (
          <Pressable
            onPress={startStripeCheckout}
            disabled={paying}
            style={({ pressed }) => [
              styles.payBtn,
              (pressed || paying) && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.payText}>{paying ? 'Starting Checkout…' : 'Pay with Stripe'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.divider} />
        <Text style={styles.section}>Items</Text>
        {items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{it.product?.title || 'Item'}</Text>
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
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
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
  hint: { color: '#9AA', marginTop: 10, fontWeight: '700' },
  payBtn: {
    marginTop: 12,
    backgroundColor: '#A020F0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  payText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#2A2A44', marginVertical: 14 },
  section: { color: '#fff', fontWeight: '900', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemTitle: { color: '#fff', fontWeight: '900' },
  itemMeta: { color: '#999', fontWeight: '700', marginTop: 4 },
  itemPrice: { color: '#00E5FF', fontWeight: '900' },
  backBtn: { marginTop: 10, alignItems: 'center' },
  backText: { color: '#A020F0', fontWeight: '900' },
});
