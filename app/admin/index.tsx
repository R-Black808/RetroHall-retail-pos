import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Package, CalendarDays, Table2, Bell, BarChart3, ShoppingBag, Boxes, Users } from 'lucide-react-native';

export default function AdminHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<'owner' | 'staff' | null>(null);
  const isOwner = adminRole === 'owner';
  const [counts, setCounts] = useState({
    products: 0,
    events: 0,
    todaysReservations: 0,
    activeReservations: 0,
  });

  const todayString = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

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
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      const ok = !!data;
      setIsAdmin(ok);
      if (ok) await fetchCounts();
    } catch (e) {
      console.error('Error checking admin:', e);
      setIsAdmin(false);
      setAdminRole(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      // Use head count queries for speed
      const [{ count: products }, { count: events }, { count: todaysReservations }, { count: activeReservations }] =
        await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase
            .from('table_reservations')
            .select('*', { count: 'exact', head: true })
            .eq('reservation_date', todayString),
          supabase
            .from('table_reservations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        ]);

      setCounts({
        products: products ?? 0,
        events: events ?? 0,
        todaysReservations: todaysReservations ?? 0,
        activeReservations: activeReservations ?? 0,
      });
    } catch (e) {
      console.error('Error fetching counts:', e);
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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Run Retro Hall from one place</Text>
          </View>

          <View style={styles.kpis}>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Today’s reservations</Text>
              <Text style={styles.kpiValue}>{counts.todaysReservations}</Text>
            </LinearGradient>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Active reservations</Text>
              <Text style={styles.kpiValue}>{counts.activeReservations}</Text>
            </LinearGradient>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Products</Text>
              <Text style={styles.kpiValue}>{counts.products}</Text>
            </LinearGradient>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Events</Text>
              <Text style={styles.kpiValue}>{counts.events}</Text>
            </LinearGradient>
          </View>

          <View style={styles.cards}>
            <Pressable style={styles.card} onPress={() => router.push('/admin/products')}>
              <View style={styles.iconWrap}>
                <Package size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Products</Text>
                <Text style={styles.cardSub}>Add and manage inventory</Text>
              </View>
            </Pressable>


            <Pressable style={styles.card} onPress={() => router.push('/admin/inventory')}>
              <View style={styles.iconWrap}>
                <Boxes size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Inventory</Text>
                <Text style={styles.cardSub}>Adjust stock, low-stock alerts, featured</Text>
              </View>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/admin/events')}>
              <View style={styles.iconWrap}>
                <CalendarDays size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Events</Text>
                <Text style={styles.cardSub}>Create and edit events</Text>
              </View>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/admin/reservations')}>
              <View style={styles.iconWrap}>
                <Table2 size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Reservations</Text>
                <Text style={styles.cardSub}>Assign tables, cancel, mark done</Text>
              </View>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/admin/analytics')}>
              <View style={styles.iconWrap}>
                <BarChart3 size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Analytics</Text>
                <Text style={styles.cardSub}>Attendance + reservation trends</Text>
              </View>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/admin/broadcasts')}>
              <View style={styles.iconWrap}>
                <Bell size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Broadcasts</Text>
                <Text style={styles.cardSub}>Send announcements to users</Text>
              </View>
            </Pressable>

            <Pressable style={styles.card} onPress={() => router.push('/admin/orders')}>
              <View style={styles.iconWrap}>
                <ShoppingBag size={22} color="#A020F0" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Orders</Text>
                <Text style={styles.cardSub}>Manage order & preorder requests</Text>
              </View>
            </Pressable>

{isOwner && (
  <Pressable style={styles.card} onPress={() => router.push('/admin/users')}>
    <View style={styles.iconWrap}>
      <Users size={22} color="#A020F0" />
    </View>
    <View style={styles.cardText}>
      <Text style={styles.cardTitle}>Admin Users</Text>
      <Text style={styles.cardSub}>Owner-only role management</Text>
    </View>
  </Pressable>
)}

          </View>

          <Pressable onPress={fetchCounts} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh metrics</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11111F' },
  gradient: { flex: 1, padding: 20 },
  scroll: { paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorSubtext: { color: '#999', fontSize: 14, textAlign: 'center' },

  header: { marginTop: 10, marginBottom: 14 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#999', marginTop: 6 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  kpiLabel: { color: '#AAA', fontWeight: '800', fontSize: 12 },
  kpiValue: { color: '#FFFFFF', fontWeight: '900', fontSize: 24, marginTop: 6 },

  cards: { gap: 14, marginTop: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  cardDisabled: { opacity: 0.6 },
  iconWrap: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: '#11111F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  cardText: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cardSub: { color: '#999', marginTop: 4, fontSize: 13 },

  refreshBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A44',
    backgroundColor: '#11111F',
  },
  refreshText: { color: '#FFFFFF', fontWeight: '900' },
});
