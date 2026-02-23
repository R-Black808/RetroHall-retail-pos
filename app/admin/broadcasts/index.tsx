import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Megaphone, Send } from 'lucide-react-native';

type BroadcastType = 'broadcast' | 'promo' | 'event' | 'general';

interface BroadcastRow {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export default function AdminBroadcasts() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<BroadcastType>('broadcast');

  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const charCount = useMemo(() => message.trim().length, [message]);

  useEffect(() => {
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const checkAdmin = async () => {
    if (!user?.id) {
      setChecking(false);
      return;
    }
    try {
      setChecking(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      const ok = !!data;
      setIsAdmin(ok);
      if (ok) await fetchHistory();
    } catch (e) {
      console.error('Error checking admin:', e);
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistory((data as BroadcastRow[]) ?? []);
    } catch (e) {
      console.error('Error fetching broadcasts:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const sendBroadcast = async () => {
    if (!user?.id) return;
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) {
      Alert.alert('Missing info', 'Please enter a title and message.');
      return;
    }

    try {
      setSending(true);

      // 1) Create audit trail record.
      const { data: broadcastRow, error: bErr } = await supabase
        .from('broadcasts')
        .insert({ title: t, message: m, type, created_by: user.id })
        .select('*')
        .single();
      if (bErr) throw bErr;

      // 2) Fetch recipients (all users).
      const { data: profiles, error: pErr } = await supabase.from('user_profiles').select('id, expo_push_token');
      if (pErr) throw pErr;

      const ids = (profiles ?? []).map((p: any) => p.id).filter(Boolean);
      if (!ids.length) {
        Alert.alert('No users', 'No user profiles were found to receive this broadcast.');
        return;
      }

      // 3) Insert notifications in chunks.
      const rows = ids.map((uid: string) => ({
        user_id: uid,
        title: t,
        message: m,
        type: 'broadcast',
        related_id: broadcastRow?.id,
      }));

      const parts = chunk(rows, 500);
      for (const part of parts) {
        const { error } = await supabase.from('notifications').insert(part);
        if (error) throw error;
      }

// 4) Send push notifications (best-effort).
const tokens = (profiles ?? [])
  .map((p: any) => p.expo_push_token)
  .filter((t: any) => typeof t === 'string' && t.length > 0);
await sendExpoPush(tokens, t, m);

      setTitle('');
      setMessage('');
      setType('broadcast');
      Alert.alert('Sent!', `Broadcast delivered to ${ids.length} users.`);
      await fetchHistory();
    } catch (e: any) {
      console.error('Error sending broadcast:', e);
      Alert.alert('Broadcast failed', e?.message ?? 'Something went wrong sending the broadcast.');
    } finally {
      setSending(false);
    }
  };

  if (checking) {
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

  const TypePill = ({ value }: { value: BroadcastType }) => (
    <Pressable
      onPress={() => setType(value)}
      style={[styles.pill, type === value ? styles.pillActive : styles.pillInactive]}>
      <Text style={[styles.pillText, type === value ? styles.pillTextActive : styles.pillTextInactive]}>
        {value.toUpperCase()}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#11111F', '#0B0B14']} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color="#A020F0" />
            </Pressable>
            <Text style={styles.title}>Broadcasts</Text>
          </View>

          <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.composeCard}>
            <View style={styles.composeHeader}>
              <View style={styles.iconWrap}>
                <Megaphone size={18} color="#A020F0" />
              </View>
              <Text style={styles.composeTitle}>Send announcement</Text>
            </View>

            <View style={styles.pillsRow}>
              <TypePill value="broadcast" />
              <TypePill value="promo" />
              <TypePill value="event" />
              <TypePill value="general" />
            </View>

            <TextInput
              placeholder="Title"
              placeholderTextColor="#777"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              maxLength={60}
            />

            <TextInput
              placeholder="Message"
              placeholderTextColor="#777"
              value={message}
              onChangeText={setMessage}
              style={[styles.input, styles.textArea]}
              multiline
              maxLength={500}
            />

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>To: All users</Text>
              <Text style={styles.metaText}>{charCount}/500</Text>
            </View>

            <Pressable onPress={sendBroadcast} disabled={sending} style={[styles.sendBtn, sending && styles.sendBtnDisabled]}>
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.sendText}>Send Broadcast</Text>
                </>
              )}
            </Pressable>
          </LinearGradient>

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent broadcasts</Text>
            <Pressable onPress={fetchHistory}>
              <Text style={styles.historyRefresh}>Refresh</Text>
            </Pressable>
          </View>

          {loadingHistory ? (
            <View style={styles.loadingHistory}>
              <ActivityIndicator color="#A020F0" />
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.historyCard}>
                  <Text style={styles.historyItemTitle}>{item.title}</Text>
                  <Text style={styles.historyItemMessage} numberOfLines={3}>
                    {item.message}
                  </Text>
                  <View style={styles.historyMetaRow}>
                    <Text style={styles.historyMeta}>{(item.type || 'broadcast').toUpperCase()}</Text>
                    <Text style={styles.historyMeta}>{new Date(item.created_at).toLocaleString()}</Text>
                  </View>
                </LinearGradient>
              )}
              ListEmptyComponent={
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyText}>No broadcasts yet.</Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11111F' },
  gradient: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorSubtext: { color: '#999', fontSize: 14, textAlign: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#222',
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },

  composeCard: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#222' },
  composeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#222',
  },
  composeTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },

  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  pillActive: { backgroundColor: '#A020F0', borderColor: '#A020F0' },
  pillInactive: { backgroundColor: '#0B0B14', borderColor: '#222' },
  pillText: { fontSize: 11, fontWeight: '800' },
  pillTextActive: { color: '#fff' },
  pillTextInactive: { color: '#bbb' },

  input: {
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 12,
    color: '#fff',
    marginTop: 10,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { color: '#999', fontSize: 12 },

  sendBtn: {
    marginTop: 12,
    backgroundColor: '#A020F0',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendBtnDisabled: { opacity: 0.7 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  historyTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  historyRefresh: { color: '#A020F0', fontWeight: '800' },
  loadingHistory: { paddingVertical: 18 },

  historyCard: { borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#222', marginBottom: 10 },
  historyItemTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  historyItemMessage: { color: '#cfcfcf', marginTop: 6, fontSize: 12 },
  historyMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  historyMeta: { color: '#777', fontSize: 11, fontWeight: '700' },

  emptyHistory: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: '#999' },
});
async function sendExpoPush(tokens: string[], title: string, body: string) {
  if (!tokens.length) return;

  // Expo push endpoint accepts up to 100 messages per request.
  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    data: { type: 'broadcast' },
  }));

  const parts = chunk(messages, 100);
  for (const part of parts) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(part),
      });
      const json = await res.json();
      if (!res.ok) {
        console.warn('Expo push error:', json);
      }
    } catch (e) {
      console.warn('Expo push request failed:', e);
    }
  }
}

