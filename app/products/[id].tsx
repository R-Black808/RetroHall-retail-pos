import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase, Product } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const stockQty = useMemo(() => (product?.stock_qty ?? 0), [product?.stock_qty]);
  const isInStock = stockQty > 0;

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setProduct((data as Product) || null);
    } catch (e) {
      console.error('Error fetching product:', e);
      Alert.alert('Error', 'Unable to load this product.');
    } finally {
      setLoading(false);
    }
  };

  const createOrderForProduct = async () => {
    if (!user?.id) {
      Alert.alert('Login required', 'Please sign in to place an order request.');
      router.push('/auth');
      return;
    }
    if (!product) return;

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('create_order_request', {
        p_product_id: product.id,
        p_quantity: 1,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;

      Alert.alert(
        'Request sent',
        row?.is_preorder
          ? 'Your preorder request is in. An admin will confirm availability.'
          : 'Your order request is in. An admin will confirm pickup/fulfillment.',
        [{ text: 'View Orders', onPress: () => router.push('/orders') }]
      );

      await fetchProduct();
    } catch (e: any) {
      console.error('Order request error:', e);
      Alert.alert('Error', e?.message || 'Unable to place request.');
    } finally {
      setSubmitting(false);
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

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={{ color: '#fff' }}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#11111F', '#0A0014']} style={styles.card}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.system}>{product.system}</Text>

          <View style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{product.category}</Text>
            </View>
            <View style={[styles.badge, { borderColor: isInStock ? '#00FF00' : '#FF286A' }]}>
              <Text style={[styles.badgeText, { color: isInStock ? '#00FF00' : '#FF286A' }]}
              >
                {isInStock ? `In stock: ${stockQty}` : 'Preorder'}
              </Text>
            </View>
          </View>

          <Text style={styles.price}>${Number(product.price).toFixed(2)}</Text>

          {product.description ? (
            <Text style={styles.desc}>{product.description}</Text>
          ) : null}

          <Pressable style={[styles.cta, submitting && { opacity: 0.7 }]} onPress={createOrderForProduct} disabled={submitting}>
            <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.ctaGrad}>
              <Text style={styles.ctaText}>
                {submitting ? 'Submitting...' : isInStock ? 'Request Purchase' : 'Request Preorder'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 28 },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  system: { color: '#A020F0', marginTop: 6, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  badge: {
    borderWidth: 1,
    borderColor: '#A020F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(160,32,240,0.08)',
  },
  badgeText: { color: '#A020F0', fontWeight: '800', fontSize: 12 },
  price: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 16 },
  desc: { color: '#DDD', marginTop: 12, lineHeight: 20 },
  cta: { marginTop: 18, borderRadius: 14, overflow: 'hidden' },
  ctaGrad: { paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '900' },
  secondary: { marginTop: 12, alignItems: 'center' },
  secondaryText: { color: '#999', fontWeight: '700' },
});
