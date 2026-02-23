import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Crown, UserPlus, Trash2, Shield } from 'lucide-react-native';

type AdminRole = 'owner' | 'staff';

type AdminUserRow = {
  id: string;
  role: AdminRole | null;
  created_at: string;
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [promoteId, setPromoteId] = useState('');
  const [promoteRole, setPromoteRole] = useState<AdminRole>('staff');

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const init = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.from('admin_users').select('id, role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      const owner = !!data && data.role === 'owner';
      setIsOwner(owner);
      if (owner) await fetchAdmins();
    } catch (e) {
      console.error('Admin user init error:', e);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    const { data, error } = await supabase.from('admin_users').select('id, role, created_at').order('created_at', { ascending: true });
    if (error) throw error;
    setAdmins((data as any) || []);
  };

  const handlePromote = async () => {
    const id = promoteId.trim();
    if (!id) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('admin_users').upsert({ id, role: promoteRole }, { onConflict: 'id' });
      if (error) throw error;
      setPromoteId('');
      Alert.alert('Success', `User promoted to ${promoteRole}.`);
      fetchAdmins();
    } catch (e: any) {
      console.error('Promote error:', e);
      Alert.alert('Error', e?.message || 'Unable to promote user.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (adminId: string, nextRole: AdminRole) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('admin_users').update({ role: nextRole }).eq('id', adminId);
      if (error) throw error;
      fetchAdmins();
    } catch (e: any) {
      console.error('Role update error:', e);
      Alert.alert('Error', e?.message || 'Unable to update role.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (adminId: string) => {
    if (adminId === user?.id) {
      Alert.alert('Not allowed', "You can't remove yourself.");
      return;
    }
    Alert.alert('Remove admin', 'Are you sure you want to remove this admin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase.from('admin_users').delete().eq('id', adminId);
            if (error) throw error;
            fetchAdmins();
          } catch (e: any) {
            console.error('Remove error:', e);
            Alert.alert('Error', e?.message || 'Unable to remove admin.');
          } finally {
            setLoading(false);
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

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Owner Access Required</Text>
          <Text style={styles.deniedText}>Only owners can manage admin users.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0B0012', '#07000D', '#000']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Users</Text>
          <Text style={styles.subtitle}>Promote staff and manage roles</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={18} color="#A020F0" />
            <Text style={styles.cardTitle}>Promote User</Text>
          </View>

          <Text style={styles.help}>
            Paste the user's Auth UID (from Supabase Auth users table). Set role then promote.
          </Text>

          <TextInput
            value={promoteId}
            onChangeText={setPromoteId}
            placeholder="Auth UID (uuid)"
            placeholderTextColor="#666"
            style={styles.input}
            autoCapitalize="none"
          />

          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleChip, promoteRole === 'staff' && styles.roleChipOn]}
              onPress={() => setPromoteRole('staff')}
            >
              <Shield size={14} color={promoteRole === 'staff' ? '#A020F0' : '#AAA'} />
              <Text style={[styles.roleText, promoteRole === 'staff' && styles.roleTextOn]}>Staff</Text>
            </Pressable>

            <Pressable
              style={[styles.roleChip, promoteRole === 'owner' && styles.roleChipOn]}
              onPress={() => setPromoteRole('owner')}
            >
              <Crown size={14} color={promoteRole === 'owner' ? '#A020F0' : '#AAA'} />
              <Text style={[styles.roleText, promoteRole === 'owner' && styles.roleTextOn]}>Owner</Text>
            </Pressable>

            <Pressable style={styles.primaryBtn} onPress={handlePromote}>
              <Text style={styles.primaryBtnText}>Promote</Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={admins}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.id}</Text>
                <Text style={styles.rowSub}>Role: {item.role || 'staff'}</Text>
              </View>

              <View style={styles.rowActions}>
                <Pressable
                  style={[styles.smallBtn, (item.role || 'staff') === 'staff' && styles.smallBtnOn]}
                  onPress={() => handleChangeRole(item.id, 'staff')}
                >
                  <Text style={styles.smallBtnText}>Staff</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, item.role === 'owner' && styles.smallBtnOn]}
                  onPress={() => handleChangeRole(item.id, 'owner')}
                >
                  <Text style={styles.smallBtnText}>Owner</Text>
                </Pressable>
                <Pressable style={[styles.smallBtn, styles.dangerBtn]} onPress={() => handleRemove(item.id)}>
                  <Trash2 size={14} color="#FF6B6B" />
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#AAA' }}>No admins found.</Text>
            </View>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingTop: 10 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#BDBDBD', marginTop: 6 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  deniedText: { color: '#AAA', marginTop: 8, textAlign: 'center' },

  card: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  help: { color: '#AAA', fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  roleChipOn: { borderColor: '#A020F0' },
  roleText: { color: '#AAA', fontWeight: '800', fontSize: 12 },
  roleTextOn: { color: '#EAEAEA' },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#A020F0',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },

  row: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  rowTitle: { color: '#fff', fontWeight: '800', fontSize: 12 },
  rowSub: { color: '#AAA', marginTop: 4, fontSize: 12 },
  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  smallBtnOn: { borderColor: '#A020F0' },
  smallBtnText: { color: '#EAEAEA', fontWeight: '800', fontSize: 12 },
  dangerBtn: { borderColor: 'rgba(255,107,107,0.5)' },
});
