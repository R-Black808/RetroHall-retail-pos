import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === 'signup' && !displayName.trim()) return false;
    return true;
  }, [email, password, displayName, mode]);

  // If already signed in, go to app.
  if (!loading && user) {
    router.replace('/(tabs)');
    return null;
  }

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim());
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Auth error', e?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>RETRO HALL</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </Text>
        </View>

        <View style={styles.card}>
          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Roy Lujan"
                placeholderTextColor="#666"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor="#666"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#666"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Pressable onPress={onSubmit} disabled={!canSubmit || submitting} style={styles.primaryBtn}>
            <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.primaryGradient}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Pressable
              onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
              hitSlop={10}>
              <Text style={styles.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerHint}>
          Tip: if email confirmation is enabled in Supabase, you may need to verify your email before signing in.
        </Text>
      </KeyboardAvoidingView>
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
    paddingTop: 18,
    paddingBottom: 12,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: '#A020F0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    marginTop: 6,
    color: '#A020F0',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: '#11111F',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0A0014',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A1144',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
  },
  primaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  switchRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  switchText: {
    color: '#AAA',
    fontSize: 12,
  },
  switchLink: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '800',
  },
  footerHint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 26,
  },
});
