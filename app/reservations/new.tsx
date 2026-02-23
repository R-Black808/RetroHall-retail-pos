import { useMemo, useState } from 'react';
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
import { ArrowLeft, Calendar, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Simple slot set (easy to expand later).
const TIME_SLOTS = ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];

export default function NewReservationScreen() {
  const { user } = useAuth();
  const { event_id } = useLocalSearchParams<{ event_id?: string }>();

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [slot, setSlot] = useState<string>(TIME_SLOTS[1]);
  const [partySize, setPartySize] = useState('4');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const partySizeNum = useMemo(() => {
    const n = Number(partySize);
    return Number.isFinite(n) ? n : NaN;
  }, [partySize]);

  const canSubmit = useMemo(() => {
    if (!user?.id) return false;
    if (!slot) return false;
    if (!partySizeNum || partySizeNum < 1 || partySizeNum > 12) return false;
    return true;
  }, [user?.id, slot, partySizeNum]);

  const submit = async () => {
    if (!user?.id) {
      router.replace('/auth');
      return;
    }
    if (!canSubmit || busy) return;

    try {
      setBusy(true);

      // Conflict check: same day + slot, only for active reservations.
      const yyyyMmDd = date.toISOString().slice(0, 10);
      const { data: conflicts, error: conflictErr } = await supabase
        .from('table_reservations')
        .select('id')
        .eq('reservation_date', yyyyMmDd)
        .eq('time_slot', slot)
        .eq('status', 'active');
      if (conflictErr) throw conflictErr;

      // You can tune this number to match your store's table capacity.
      const MAX_TABLES_PER_SLOT = 6;
      if ((conflicts?.length ?? 0) >= MAX_TABLES_PER_SLOT) {
        Alert.alert('Booked', 'That time slot is full. Try a different time.');
        return;
      }

      const { error } = await supabase.from('table_reservations').insert({
        user_id: user.id,
        event_id: event_id ?? null,
        reservation_date: yyyyMmDd,
        time_slot: slot,
        party_size: partySizeNum,
        notes: notes.trim() || null,
        status: 'active',
      });
      if (error) throw error;

      Alert.alert('Booked!', 'Your table reservation is confirmed.');
      router.replace('/reservations');
    } catch (e: any) {
      console.error('Reservation create error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to book');
    } finally {
      setBusy(false);
    }
  };

  const shiftDay = (deltaDays: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + deltaDays);
    next.setHours(0, 0, 0, 0);
    setDate(next);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn}>
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Reserve a Table</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.card}>
          <Text style={styles.sectionTitle}>Choose a date</Text>

          <View style={styles.dateRow}>
            <Pressable onPress={() => shiftDay(-1)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>−1</Text>
            </Pressable>

            <View style={styles.datePill}>
              <Calendar size={16} color="#00E5FF" strokeWidth={2} />
              <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            </View>

            <Pressable onPress={() => shiftDay(1)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+1</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Time slot</Text>
          <View style={styles.slotWrap}>
            {TIME_SLOTS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setSlot(t)}
                style={[styles.slotBtn, slot === t && styles.slotBtnActive]}>
                <Text style={[styles.slotText, slot === t && styles.slotTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Party size</Text>
          <View style={styles.partyRow}>
            <View style={styles.partyIcon}>
              <Users size={16} color="#00E5FF" strokeWidth={2} />
            </View>
            <TextInput
              value={partySize}
              onChangeText={setPartySize}
              keyboardType="number-pad"
              placeholder="4"
              placeholderTextColor="#666"
              style={styles.partyInput}
              maxLength={2}
            />
            <Text style={styles.partyHint}>(1–12)</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="D&D campaign, need 2 outlets, etc."
            placeholderTextColor="#666"
            style={styles.notes}
            multiline
          />
        </LinearGradient>

        <Pressable onPress={submit} disabled={!canSubmit || busy} style={styles.primaryBtn}>
          <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.primaryGrad}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Book Table</Text>}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.push('/reservations')} style={styles.link} hitSlop={10}>
          <Text style={styles.linkText}>View my reservations</Text>
        </Pressable>
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
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2A1144' },
  sectionTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A020F0',
    backgroundColor: '#0A0014',
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  dateText: { color: '#FFFFFF', fontWeight: '800' },
  smallBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1144',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#11111F',
  },
  smallBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  slotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1144',
    backgroundColor: '#0A0014',
  },
  slotBtnActive: { borderColor: '#00E5FF', backgroundColor: '#00E5FF22' },
  slotText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  slotTextActive: { color: '#00E5FF' },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  partyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1144',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0014',
  },
  partyInput: {
    flex: 1,
    backgroundColor: '#0A0014',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A020F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  partyHint: { color: '#666', fontWeight: '700' },
  notes: {
    marginTop: 10,
    backgroundColor: '#0A0014',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1144',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  primaryBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 14 },
  primaryGrad: { paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
  link: { marginTop: 14, alignItems: 'center' },
  linkText: { color: '#00E5FF', fontWeight: '900' },
});
