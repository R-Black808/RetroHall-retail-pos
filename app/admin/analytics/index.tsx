import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';

type EventRow = {
  id: string;
  title: string;
  date: string;
  max_attendees: number | null;
};

type ReservationRow = {
  id: string;
  reservation_date: string; // YYYY-MM-DD
  time_slot: string;
  status: string | null;
  table_number: number | null;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reservationStats, setReservationStats] = useState({
    total30d: 0,
    active30d: 0,
    completed30d: 0,
    cancelled30d: 0,
    noShow30d: 0,
  });

  const [reservationsByDay, setReservationsByDay] = useState<{ date: string; count: number }[]>([]);
  const [reservationsBySlot, setReservationsBySlot] = useState<{ slot: string; count: number }[]>([]);

  const [topEvents, setTopEvents] = useState<
    { id: string; title: string; date: string; attendees: number; max: number | null }[]
  >([]);

  const rangeStart30 = useMemo(() => toISODate(daysAgo(30)), []);
  const rangeStart90 = useMemo(() => new Date(daysAgo(90)).toISOString(), []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadReservations(), loadEventAttendance()]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadReservations(), loadEventAttendance()]);
    } finally {
      setRefreshing(false);
    }
  };

  const loadReservations = async () => {
    // Pull last 30 days worth of reservations (all statuses)
    const { data, error } = await supabase
      .from('table_reservations')
      .select('id,reservation_date,time_slot,status,table_number')
      .gte('reservation_date', rangeStart30)
      .order('reservation_date', { ascending: true });

    if (error) {
      console.error('Analytics: reservations query error', error);
      return;
    }

    const rows = (data ?? []) as ReservationRow[];

    // Status stats
    const total30d = rows.length;
    const active30d = rows.filter((r) => (r.status ?? 'active') === 'active').length;
    const completed30d = rows.filter((r) => r.status === 'completed').length;
    const cancelled30d = rows.filter((r) => r.status === 'cancelled').length;
    const noShow30d = rows.filter((r) => r.status === 'no_show').length;

    setReservationStats({ total30d, active30d, completed30d, cancelled30d, noShow30d });

    // By day
    const byDayMap = new Map<string, number>();
    for (const r of rows) {
      const k = r.reservation_date;
      byDayMap.set(k, (byDayMap.get(k) ?? 0) + 1);
    }
    const byDay = Array.from(byDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    setReservationsByDay(byDay);

    // By time slot
    const bySlotMap = new Map<string, number>();
    for (const r of rows) {
      const slot = (r.time_slot ?? '').trim() || 'Unknown';
      bySlotMap.set(slot, (bySlotMap.get(slot) ?? 0) + 1);
    }
    const bySlot = Array.from(bySlotMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([slot, count]) => ({ slot, count }));
    setReservationsBySlot(bySlot);
  };

  const loadEventAttendance = async () => {
    // Get events from last 90 days, then attendee counts
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id,title,date,max_attendees')
      .gte('date', rangeStart90)
      .order('date', { ascending: false });

    if (eventsError) {
      console.error('Analytics: events query error', eventsError);
      return;
    }

    const eventRows = (events ?? []) as EventRow[];
    if (eventRows.length === 0) {
      setTopEvents([]);
      return;
    }

    const eventIds = eventRows.map((e) => e.id);

    // Pull attendees for those events
    const { data: attendees, error: attError } = await supabase
      .from('event_attendees')
      .select('event_id')
      .in('event_id', eventIds);

    if (attError) {
      console.error('Analytics: attendees query error', attError);
      return;
    }

    const counts = new Map<string, number>();
    for (const row of attendees ?? []) {
      const eid = (row as any).event_id as string;
      counts.set(eid, (counts.get(eid) ?? 0) + 1);
    }

    const enriched = eventRows
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        attendees: counts.get(e.id) ?? 0,
        max: e.max_attendees ?? null,
      }))
      .sort((a, b) => b.attendees - a.attendees)
      .slice(0, 6);

    setTopEvents(enriched);
  };

  const maxByDay = useMemo(() => Math.max(1, ...reservationsByDay.map((d) => d.count)), [reservationsByDay]);
  const maxBySlot = useMemo(() => Math.max(1, ...reservationsBySlot.map((d) => d.count)), [reservationsBySlot]);
  const maxEventAtt = useMemo(() => Math.max(1, ...topEvents.map((e) => e.attendees)), [topEvents]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A020F0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#11111F', '#0B0B14']} style={styles.gradient}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.topBtn}>
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>Analytics</Text>
          <Pressable onPress={onRefresh} style={styles.topBtn} disabled={refreshing}>
            <RefreshCw size={20} color={refreshing ? '#666' : '#fff'} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Reservation usage (last 30 days)</Text>

          <View style={styles.kpis}>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total</Text>
              <Text style={styles.kpiValue}>{reservationStats.total30d}</Text>
            </LinearGradient>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Active</Text>
              <Text style={styles.kpiValue}>{reservationStats.active30d}</Text>
            </LinearGradient>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Completed</Text>
              <Text style={styles.kpiValue}>{reservationStats.completed30d}</Text>
            </LinearGradient>
            <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cancelled / No-show</Text>
              <Text style={styles.kpiValue}>{reservationStats.cancelled30d + reservationStats.noShow30d}</Text>
            </LinearGradient>
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.cardTitle}>Reservations by day</Text>
            {reservationsByDay.length === 0 ? (
              <Text style={styles.muted}>No reservations in the last 30 days yet.</Text>
            ) : (
              reservationsByDay.slice(-14).map((d) => (
                <View key={d.date} style={styles.row}>
                  <Text style={styles.rowLabel}>{d.date}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.bar, { width: `${Math.round((d.count / maxByDay) * 100)}%` }]} />
                  </View>
                  <Text style={styles.rowValue}>{d.count}</Text>
                </View>
              ))
            )}
            <Text style={styles.helper}>Showing the most recent 14 days.</Text>
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.cardTitle}>Peak time slots</Text>
            {reservationsBySlot.length === 0 ? (
              <Text style={styles.muted}>No time-slot data yet.</Text>
            ) : (
              reservationsBySlot.map((d) => (
                <View key={d.slot} style={styles.row}>
                  <Text style={styles.rowLabel}>{d.slot}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.bar, { width: `${Math.round((d.count / maxBySlot) * 100)}%` }]} />
                  </View>
                  <Text style={styles.rowValue}>{d.count}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Attendance trends (last 90 days)</Text>

          <View style={styles.cardBlock}>
            <Text style={styles.cardTitle}>Top events by attendance</Text>
            {topEvents.length === 0 ? (
              <Text style={styles.muted}>No recent events found.</Text>
            ) : (
              topEvents.map((e) => (
                <View key={e.id} style={styles.row}>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.bar, { width: `${Math.round((e.attendees / maxEventAtt) * 100)}%` }]} />
                  </View>
                  <Text style={styles.rowValue}>
                    {e.attendees}
                    {e.max ? `/${e.max}` : ''}
                  </Text>
                </View>
              ))
            )}
            <Text style={styles.helper}>Attendance counts are based on event_attendees rows.</Text>
          </View>

          <View style={{ height: 22 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11111F' },
  gradient: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  topBtn: {
    height: 38,
    width: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A44',
  },

  scroll: { paddingBottom: 26 },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 8 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  kpiLabel: { color: '#AAA', fontWeight: '800', fontSize: 12 },
  kpiValue: { color: '#FFFFFF', fontWeight: '900', fontSize: 24, marginTop: 6 },

  cardBlock: {
    marginTop: 14,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 10 },
  muted: { color: '#999' },
  helper: { color: '#777', marginTop: 10, fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  rowLabel: { color: '#ddd', flex: 1, fontSize: 12 },
  barWrap: {
    flex: 2,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#11111F',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A44',
  },
  bar: { height: '100%', backgroundColor: '#A020F0' },
  rowValue: { color: '#fff', width: 54, textAlign: 'right', fontWeight: '800', fontSize: 12 },
});
