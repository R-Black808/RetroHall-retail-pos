import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function OrderReturnScreen() {
  const { order_id, result } = useLocalSearchParams<{ order_id?: string; result?: string }>();

  useEffect(() => {
    // If we have an order id, jump to the order detail so the user can refresh.
    if (order_id) {
      const t = setTimeout(() => {
        router.replace(`/orders/${order_id}`);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [order_id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Back to Retro Hall</Text>
        <Text style={styles.text}>
          {result === 'success'
            ? 'Payment complete! We’re updating your order now.'
            : 'Payment cancelled. You can try again anytime.'}
        </Text>

        {order_id ? (
          <Pressable onPress={() => router.replace(`/orders/${order_id}`)} style={styles.btn}>
            <Text style={styles.btnText}>View Order</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.replace('/orders')} style={styles.btn}>
            <Text style={styles.btnText}>Go to Orders</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014', justifyContent: 'center', alignItems: 'center' },
  box: {
    width: '90%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A44',
    backgroundColor: '#11111F',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  text: { color: '#CFCFEA', marginTop: 10, fontWeight: '700', lineHeight: 20 },
  btn: {
    marginTop: 14,
    backgroundColor: '#A020F0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '900' },
});
