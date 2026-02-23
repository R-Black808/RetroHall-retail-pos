import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Users, ArrowLeft, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type EventRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  max_attendees: number;
  game_type: string;
  created_by: string;
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const eventDate = useMemo(() => {
    if (!event?.date) return null;
    const d = new Date(event.date);
    return isNaN(d.getTime()) ? null : d;
  }, [event?.date]);

  useEffect(() => {
    if (!id) return;
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      setEvent(data as any);

      const { data: attendees, error: attErr } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', id);
      if (attErr) throw attErr;
      setParticipantCount(attendees?.length ?? 0);

      if (user?.id) {
        const { data: joined, error: jErr } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (jErr) throw jErr;
        setIsJoined(!!joined);
      } else {
        setIsJoined(false);
      }
    } catch (e: any) {
      console.error('Event detail error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to join events.');
      router.replace('/auth');
      return;
    }
    if (!event) return;
    if (participantCount >= event.max_attendees) {
      Alert.alert('Full', 'This event is at capacity.');
      return;
    }

    try {
      setBusy(true);
      const { error } = await supabase.from('event_attendees').insert({ event_id: event.id, user_id: user.id });
      if (error) throw error;
      setIsJoined(true);
      setParticipantCount((c) => c + 1);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not join');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!user?.id || !event) return;
    Alert.alert('Leave event', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const { error } = await supabase
              .from('event_attendees')
              .delete()
              .eq('event_id', event.id)
              .eq('user_id', user.id);
            if (error) throw error;
            setIsJoined(false);
            setParticipantCount((c) => Math.max(0, c - 1));
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not leave');
          } finally {
            setBusy(false);
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

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.title}>Event not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBarBtn}>
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
        <Text style={styles.topBarTitle}>Event Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6A0DAD', '#A020F0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.gameType}>{event.game_type}</Text>

          <View style={styles.metaRow}>
            <Calendar size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>
              {eventDate ? eventDate.toLocaleDateString() : 'TBA'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Clock size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>
              {eventDate ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>

          <View style={styles.metaRow}>
            <Users size={16} color="#00E5FF" strokeWidth={2} />
            <Text style={styles.metaText}>
              {participantCount}/{event.max_attendees} attending
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>About</Text>
          <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
        </LinearGradient>

        {!isJoined ? (
          <Pressable onPress={join} disabled={busy} style={styles.primaryBtn}>
            <LinearGradient colors={['#FF286A', '#A020F0']} style={styles.primaryGradient}>
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryText}>Join Event</Text>
              )}
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={leave} disabled={busy} style={styles.secondaryBtn}>
            {busy ? (
              <ActivityIndicator color="#FF286A" />
            ) : (
              <Text style={styles.secondaryText}>Leave Event</Text>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push({ pathname: '/reservations/new', params: { event_id: event.id } })}
          style={styles.reservationLink}
          hitSlop={10}>
          <Text style={styles.reservationLinkText}>Reserve a table for game night →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0014' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: '#A020F0', padding: 16 },
  eventTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  gameType: { color: '#FF286A', marginTop: 6, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  metaText: { color: '#FFFFFF', fontSize: 13, flex: 1 },
  divider: { height: 1, backgroundColor: '#FFFFFF22', marginVertical: 14 },
  sectionLabel: { color: '#00E5FF', fontSize: 12, fontWeight: '900', marginBottom: 6 },
  description: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  primaryBtn: { marginTop: 14, borderRadius: 12, overflow: 'hidden' },
  primaryGradient: { paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF286A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#FF286A', fontSize: 14, fontWeight: '900' },
  reservationLink: { marginTop: 14, alignItems: 'center' },
  reservationLinkText: { color: '#00E5FF', fontSize: 13, fontWeight: '800' },
  backBtn: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#A020F0', borderRadius: 10 },
  backText: { color: '#FFFFFF', fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
});
