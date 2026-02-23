import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit2, LogOut, Save } from 'lucide-react-native';
import { supabase, UserProfile } from '@/lib/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setForm({
          display_name: data.display_name || '',
          bio: data.bio || '',
        });
      } else {
        setProfile({
          id: sessionData.session.user.id,
          display_name: '',
          email: sessionData.session.user.email || '',
          bio: '',
          trade_in_credit: 0,
          total_sales: 0,
          updated_at: new Date().toISOString(),
        });
      }

      // Admin check (controls Admin Panel button)
      try {
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', sessionData.session.user.id)
          .maybeSingle();
        setIsAdmin(!!adminRow);
      } catch {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: sessionData.session.user.id,
          email: sessionData.session.user.email,
          display_name: form.display_name,
          bio: form.bio,
          trade_in_credit: profile?.trade_in_credit || 0,
          total_sales: profile?.total_sales || 0,
        });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      Alert.alert('Logged Out', 'You have been logged out');
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6A0DAD', '#A020F0']}
          style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.display_name || profile?.email || 'U')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.displayName}>
            {profile?.display_name || 'No Name Set'}
          </Text>
          <Text style={styles.email}>{profile?.email}</Text>

          {!editing && (
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.editButton}>
              <Edit2 size={18} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </Pressable>
          )}
        </LinearGradient>

        {isAdmin && !editing && (
          <Pressable style={styles.adminButton} onPress={() => router.push('/admin')}>
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </Pressable>
        )}

        {!editing && (
          <Pressable style={styles.ordersButton} onPress={() => router.push('/orders')}>
            <Text style={styles.ordersButtonText}>My Orders</Text>
          </Pressable>
        )}

{editing && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Edit Profile</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#666"
                value={form.display_name}
                onChangeText={(text) =>
                  setForm({ ...form, display_name: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your collection..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                value={form.bio}
                onChangeText={(text) => setForm({ ...form, bio: text })}
              />
            </View>

            <View style={styles.formButtons}>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setForm({
                    display_name: profile?.display_name || '',
                    bio: profile?.bio || '',
                  });
                }}
                style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={styles.saveButton}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${profile?.trade_in_credit.toFixed(2) || '0.00'}
            </Text>
            <Text style={styles.statLabel}>Trade-In Credit</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.total_sales || 0}</Text>
            <Text style={styles.statLabel}>Items Sold</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Account Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {profile?.updated_at
                ? new Date(profile.updated_at).toLocaleDateString()
                : 'Just now'}
            </Text>
          </View>
        </View>

        <View style={styles.quickLinksContainer}>
          <Text style={styles.linksTitle}>Quick Links</Text>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>My Listings</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/reservations')} style={styles.linkItem}>
            <Text style={styles.linkText}>My Reservations</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/notifications')} style={styles.linkItem}>
            <Text style={styles.linkText}>Notifications</Text>
          </Pressable>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>Trade History</Text>
          </Pressable>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>Saved Items</Text>
          </Pressable>

          <Pressable style={styles.linkItem}>
            <Text style={styles.linkText}>Settings</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleLogout}
          style={styles.logoutButton}>
          <LogOut size={18} color="#FF286A" strokeWidth={2} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0014',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#6A0DAD',
    fontSize: 32,
    fontWeight: '700',
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  adminButton: {
    backgroundColor: '#11111F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A020F0',
    marginBottom: 10,
    marginTop: 14,
  },
  adminButtonText: {
    color: '#A020F0',
    fontWeight: '800',
  },
  ordersButton: {
    backgroundColor: '#11111F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00E5FF',
    marginBottom: 14,
  },
  ordersButtonText: {
    color: '#00E5FF',
    fontWeight: '800',
  },
  formContainer: {
    backgroundColor: '#11111F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0A0014',
    borderWidth: 1,
    borderColor: '#A020F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  cancelButtonText: {
    color: '#A020F0',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#A020F0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#11111F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A020F0',
    alignItems: 'center',
  },
  statValue: {
    color: '#A020F0',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: '#11111F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    color: '#A020F0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  quickLinksContainer: {
    marginBottom: 24,
  },
  linksTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  linkItem: {
    backgroundColor: '#11111F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF286A22',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FF286A',
  },
  logoutButtonText: {
    color: '#FF286A',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
});
