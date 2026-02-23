import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Trash2 } from 'lucide-react-native';
import { supabase, UserListing } from '@/lib/supabase';

const categories = ['Games', 'Consoles', 'Accessories', 'Collectibles'];
const conditions = ['Mint', 'Good', 'Fair', 'Poor'];

export default function SellScreen() {
  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    system: '',
    category: 'Games',
    condition: 'Good',
    asking_price: '',
    description: '',
  });

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchListings = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_listings')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.system || !form.asking_price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.user) {
        Alert.alert('Error', 'You must be logged in to list items');
        return;
      }

      const { error } = await supabase.from('user_listings').insert({
        user_id: sessionData.session.user.id,
        title: form.title,
        system: form.system,
        category: form.category,
        condition: form.condition,
        asking_price: parseFloat(form.asking_price),
        description: form.description,
      });

      if (error) throw error;

      Alert.alert('Success', 'Item listed successfully');
      setForm({
        title: '',
        system: '',
        category: 'Games',
        condition: 'Good',
        asking_price: '',
        description: '',
      });
      setShowForm(false);
      fetchListings();
    } catch (error) {
      Alert.alert('Error', 'Failed to create listing');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchListings();
      Alert.alert('Success', 'Listing deleted');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete listing');
      console.error('Error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sell & Trade</Text>
        <Text style={styles.subtitle}>List your retro games</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showForm ? (
          <>
            <Pressable
              onPress={() => setShowForm(true)}
              style={styles.addButton}>
              <LinearGradient
                colors={['#FF286A', '#A020F0']}
                style={styles.addButtonGradient}>
                <Plus size={24} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.addButtonText}>List New Item</Text>
              </LinearGradient>
            </Pressable>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#A020F0" />
              </View>
            ) : listings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No listings yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap "List New Item" to get started
                </Text>
              </View>
            ) : (
              <View style={styles.listingsContainer}>
                {listings.map((listing) => (
                  <View key={listing.id} style={styles.listingCard}>
                    <View style={styles.listingContent}>
                      <Text style={styles.listingTitle}>{listing.title}</Text>
                      <View style={styles.listingMeta}>
                        <Text style={styles.listingSystem}>{listing.system}</Text>
                        <Text style={styles.listingCategory}>
                          {listing.category}
                        </Text>
                      </View>
                      <View style={styles.listingDetails}>
                        <Text style={styles.listingCondition}>
                          {listing.condition}
                        </Text>
                        <Text style={styles.listingPrice}>
                          ${listing.asking_price.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          listing.status === 'active'
                            ? styles.statusActive
                            : styles.statusInactive,
                        ]}>
                        <Text style={styles.statusText}>
                          {listing.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(listing.id)}
                      style={styles.deleteButton}>
                      <Trash2 size={20} color="#FF286A" strokeWidth={2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create New Listing</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title (Required)</Text>
              <TextInput
                style={styles.input}
                placeholder="Game/Console/Item name"
                placeholderTextColor="#666"
                value={form.title}
                onChangeText={(text) => setForm({ ...form, title: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>System (Required)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., N64, SNES, PS2"
                placeholderTextColor="#666"
                value={form.system}
                onChangeText={(text) => setForm({ ...form, system: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelect}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setForm({ ...form, category: cat })}
                    style={[
                      styles.categoryOption,
                      form.category === cat &&
                        styles.categoryOptionActive,
                    ]}>
                    <Text
                      style={[
                        styles.categoryOptionText,
                        form.category === cat &&
                          styles.categoryOptionTextActive,
                      ]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Condition</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.conditionSelect}>
                {conditions.map((cond) => (
                  <Pressable
                    key={cond}
                    onPress={() => setForm({ ...form, condition: cond })}
                    style={[
                      styles.conditionOption,
                      form.condition === cond &&
                        styles.conditionOptionActive,
                    ]}>
                    <Text
                      style={[
                        styles.conditionOptionText,
                        form.condition === cond &&
                          styles.conditionOptionTextActive,
                      ]}>
                      {cond}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Price (Required)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                value={form.asking_price}
                onChangeText={(text) =>
                  setForm({ ...form, asking_price: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add details about the condition, included items, etc."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={(text) =>
                  setForm({ ...form, description: text })
                }
              />
            </View>

            <View style={styles.formButtons}>
              <Pressable
                onPress={() => setShowForm(false)}
                style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.submitButton}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>List Item</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
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
    color: '#FF286A',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addButton: {
    marginBottom: 24,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  listingsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#11111F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A020F0',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  listingContent: {
    flex: 1,
  },
  listingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  listingSystem: {
    color: '#A020F0',
    fontSize: 12,
    fontWeight: '600',
  },
  listingCategory: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '600',
  },
  listingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listingCondition: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  listingPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#00FF0022',
  },
  statusInactive: {
    backgroundColor: '#FF286A22',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00FF00',
  },
  deleteButton: {
    padding: 8,
  },
  formContainer: {
    marginBottom: 40,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#11111F',
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
  categorySelect: {
    marginBottom: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A020F0',
    marginRight: 8,
  },
  categoryOptionActive: {
    backgroundColor: '#A020F0',
  },
  categoryOptionText: {
    color: '#A020F0',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  conditionSelect: {
    marginBottom: 8,
  },
  conditionOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginRight: 8,
  },
  conditionOptionActive: {
    backgroundColor: '#FFD70044',
  },
  conditionOptionText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  conditionOptionTextActive: {
    color: '#FFFFFF',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
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
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#A020F0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
