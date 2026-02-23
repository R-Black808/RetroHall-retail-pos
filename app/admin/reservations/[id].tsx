import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, Users, Table2, Save } from 'lucide-react-native';

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

export default function AdminReservationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [reservation, setReservation] = useState<ReservationRow | null>(null);
  const [profile, setProfile] = useState<ProfileMini | null>(null);

  const [form, setForm] = useState({
    table_number: '',
    status: 'active',
    notes: '',
    cancel_reason: '',
  });

  useEffect(() => {
    checkAdminAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  const checkAdminAndLoad = async () => {
    if (!user?.id || !id) {
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
      const ok = !!data;
      setIsAdmin(ok);
      if (!ok) return;

      const { data: res, error: resErr } = await supabase
        .from('table_reservations')
        .select('*, events(title)')
        .eq('id', id)
        .maybeSingle();
      if (resErr) throw resErr;
      if (!res) {
        Alert.alert('Not found', 'Reservation not found');
        router.back();
        return;
      }

      const row = res as any as ReservationRow;
      setReservation(row);

      setForm({
        table_number: row.table_number != null ? String(row.table_number) : '',
        status: String(row.status ?? 'active'),
        notes: row.notes ?? '',
        cancel_reason: row.cancel_reason ?? '',
      });

      // best-effort profile fetch
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('id,email,display_name')
        .eq('id', row.user_id)
        .maybeSingle();
      if (prof) setProfile(prof as any);
    } catch (e: any) {
      console.error('Reservation load error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const who = useMemo(() => {
    if (!reservation) return '';
    return profile?.display_name || profile?.email || `${reservation.user_id.slice(0, 8)}…`;
  }, [profile, reservation]);

  const save = async () => {
    if (!reservation) return;
    try {
      setSaving(true);

      const tableNum = form.table_number.trim() ? Number(form.table_number.trim()) : null;
      if (tableNum != null && (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > 99)) {
        Alert.alert('Invalid table number', 'Use a number like 1, 2, 3…');
        return;
      }

      // Prevent double-booking: table_number cannot be reused for the same day + slot (for active reservations).
      if (tableNum != null && form.status === 'active') {
        const { data: existing, error: existErr } = await supabase
          .from('table_reservations')
          .select('id')
          .eq('reservation_date', reservation.reservation_date)
          .eq('time_slot', reservation.time_slot)
          .eq('table_number', tableNum)
          .eq('status', 'active')
          .neq('id', reservation.id)
          .limit(1);

        if (existErr) throw existErr;

        if (existing && existing.length > 0) {
          Alert.alert(
            'Table already booked',
            'Table ' + tableNum + ' is already assigned for ' + new Date(reservation.reservation_date).toLocaleDateString() + ' at ' + reservation.time_slot + '. Choose a different table number.'
          );
          return;
        }
      }

      const payload: any = {
        status: form.status,
        notes: form.notes.trim() || null,
        cancel_reason: form.cancel_reason.trim() || null,
      };

      // Only include table_number if the column exists in your DB.
      // (If not, Supabase will return an error; just run the schema.sql updates.)
      payload.table_number = tableNum;

      const { error } = await supabase.from('table_reservations').update(payload).eq('id', reservation.id);
      if (error) throw error;

      Alert.alert('Saved', 'Reservation updated.');
      await checkAdminAndLoad();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <Text style={styles.errorSub}>You don’t have permission to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Reservation not found</Text>
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
        <Text style={styles.title}>Reservation</Text>
        <Pressable onPress={save} hitSlop={10} style={styles.saveBtn} disabled={saving}>
          <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.saveGrad}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.saveText}>Save</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.card}>
          <Text style={styles.cardTitle}>{who}</Text>
          <Text style={styles.cardSub}>{reservation.events?.title ?? 'No event linked'}</Text>

          <View style={styles.metaRow}>
            <Calendar size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>{new Date(reservation.reservation_date).toLocaleDateString()}</Text>
            <View style={styles.dot} />
            <Clock size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>{reservation.time_slot}</Text>
          </View>

          <View style={styles.metaRow}>
            <Users size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>Party size: {reservation.party_size}</Text>
            <View style={styles.dot} />
            <Table2 size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>Table: {reservation.table_number ?? '—'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.pills}>
            {(['active', 'completed', 'cancelled', 'no_show'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setForm((prev) => ({ ...prev, status: s }))}
                style={[styles.pill, form.status === s && styles.pillActive]}>
                <Text style={[styles.pillText, form.status === s && styles.pillTextActive]}>{s.replace('_', '-')}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Table assignment</Text>
          <TextInput
            value={form.table_number}
            onChangeText={(t) => setForm((p) => ({ ...p, table_number: t }))}
            placeholder="e.g. 1"
            placeholderTextColor="#666"
            style={styles.input}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>Tip: use 1–8 if you want fixed tables.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            value={form.notes}
            onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
            placeholder="Internal notes"
            placeholderTextColor="#666"
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancel reason (optional)</Text>
          <TextInput
            value={form.cancel_reason}
            onChangeText={(t) => setForm((p) => ({ ...p, cancel_reason: t }))}
            placeholder="Why was it cancelled?"
            placeholderTextColor="#666"
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable
          onPress={() => {
            Alert.alert('Cancel reservation', 'Set status to cancelled?', [
              { text: 'No', style: 'cancel' },
              {
                text: 'Cancel reservation',
                style: 'destructive',
                onPress: () => setForm((p) => ({ ...p, status: 'cancelled' })),
              },
            ]);
          }}
          style={styles.dangerBtn}>
          <Text style={styles.dangerText}>Set to Cancelled</Text>
        </Pressable>

        <Text style={styles.footerSpace} />
      </ScrollView>
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
  saveBtn: { borderRadius: 12, overflow: 'hidden' },
  saveGrad: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  errorSub: { color: '#AAA', marginTop: 6, textAlign: 'center' },

  content: { paddingHorizontal: 14, paddingBottom: 24 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A1144', marginBottom: 14 },
  cardTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  cardSub: { color: '#AAA', marginTop: 4, fontWeight: '700', fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  metaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2A1144', marginHorizontal: 2 },

  section: { marginBottom: 14 },
  sectionTitle: { color: '#FFFFFF', fontWeight: '900', marginBottom: 8 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: '#2A1144',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#11111F',
  },
  pillActive: { borderColor: '#A020F0' },
  pillText: { color: '#AAA', fontWeight: '900', fontSize: 12 },
  pillTextActive: { color: '#FFFFFF' },

  input: {
    borderWidth: 1,
    borderColor: '#2A1144',
    backgroundColor: '#11111F',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    fontWeight: '700',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  hint: { color: '#AAA', marginTop: 6, fontSize: 12 },

  dangerBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#5A1C33',
    backgroundColor: '#2A0F1D',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerText: { color: '#FFFFFF', fontWeight: '900' },

  footerSpace: { marginBottom: 20 },
});
