import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, Package } from 'lucide-react-native';
import { router } from 'expo-router';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  system: string;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    title: '',
    price: '',
    category: 'Games',
    system: '',
    description: '',
    stock_qty: '1',
    condition: 'Good',
  });

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(!!data);
      if (data) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddProduct = async () => {
    if (!form.title || !form.price || !form.system) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase.from('products').insert({
        title: form.title,
        price: parseFloat(form.price),
        category: form.category,
        system: form.system,
        description: form.description,
        condition: form.condition,
        stock_qty: parseInt(form.stock_qty || '0', 10) || 0,
      });

      if (error) throw error;

      Alert.alert('Success', 'Product added');
      setForm({ title: '', price: '', category: 'Games', system: '', description: '', stock_qty: '1', condition: 'Good' });
      fetchProducts();
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Manage products</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Product</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Product name"
              placeholderTextColor="#666"
              value={form.title}
              onChangeText={(title) => setForm({ ...form, title })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#666"
              value={form.price}
              onChangeText={(price) => setForm({ ...form, price })}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>System</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., PlayStation 5"
              placeholderTextColor="#666"
              value={form.system}
              onChangeText={(system) => setForm({ ...form, system })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryButtons}>
              {['Games', 'Consoles', 'Accessories', 'Collectibles'].map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setForm({ ...form, category: cat })}
                  style={[
                    styles.categoryButton,
                    form.category === cat && styles.categoryButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      form.category === cat && styles.categoryButtonTextActive,
                    ]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.categoryButtons}>
              {['Mint', 'Good', 'Fair', 'Poor'].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setForm({ ...form, condition: c })}
                  style={[
                    styles.categoryButton,
                    form.condition === c && styles.categoryButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      form.condition === c && styles.categoryButtonTextActive,
                    ]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Stock Qty</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#666"
              value={form.stock_qty}
              onChangeText={(stock_qty) => setForm({ ...form, stock_qty })}
              keyboardType="number-pad"
            />
          </View>

          
<View style={styles.formGroup}>
  <Text style={styles.label}>SKU (optional)</Text>
  <TextInput
    style={styles.input}
    placeholder="RH-PS2-0001"
    placeholderTextColor="#666"
    value={form.sku}
    onChangeText={(sku) => setForm({ ...form, sku })}
    autoCapitalize="characters"
  />
</View>

<View style={styles.formGroup}>
  <Text style={styles.label}>Barcode (optional)</Text>
  <TextInput
    style={styles.input}
    placeholder="0123456789012"
    placeholderTextColor="#666"
    value={form.barcode}
    onChangeText={(barcode) => setForm({ ...form, barcode })}
    keyboardType="number-pad"
  />
</View>

<View style={styles.formGroup}>
  <Text style={styles.label}>Supplier (optional)</Text>
  <TextInput
    style={styles.input}
    placeholder="Distributor / Vendor"
    placeholderTextColor="#666"
    value={form.supplier}
    onChangeText={(supplier) => setForm({ ...form, supplier })}
  />
</View>

<View style={styles.formGroup}>
  <Text style={styles.label}>Cost Price (optional)</Text>
  <TextInput
    style={styles.input}
    placeholder="0.00"
    placeholderTextColor="#666"
    value={form.cost_price}
    onChangeText={(cost_price) => setForm({ ...form, cost_price })}
    keyboardType="decimal-pad"
  />
</View>

<View style={styles.formGroup}>
  <Text style={styles.label}>Low Stock Threshold</Text>
  <TextInput
    style={styles.input}
    placeholder="3"
    placeholderTextColor="#666"
    value={form.low_stock_threshold}
    onChangeText={(low_stock_threshold) => setForm({ ...form, low_stock_threshold })}
    keyboardType="number-pad"
  />
</View>

<View style={styles.formGroup}>
  <Text style={styles.label}>Featured</Text>
  <Pressable
    onPress={() => setForm({ ...form, featured: !form.featured })}
    style={[styles.toggle, form.featured && styles.toggleOn]}
  >
    <Text style={styles.toggleText}>{form.featured ? 'Featured' : 'Not featured'}</Text>
  </Pressable>
</View>

<View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Product description"
              placeholderTextColor="#666"
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              multiline
              numberOfLines={4}
            />
          </View>

          <Pressable onPress={handleAddProduct} style={styles.addButton}>
            <LinearGradient colors={['#A020F0', '#FF286A']} style={styles.buttonGradient}>
              <Upload size={20} color="#FFF" strokeWidth={2} />
              <Text style={styles.buttonText}>Add Product</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.productsHeader}>
            <Package size={20} color="#A020F0" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Products ({products.length})</Text>
          </View>

          {products.map((product) => (
            <View key={product.id} style={styles.productItem}>
              <View>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productSystem}>{product.system}</Text>
              </View>
              <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0014',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A020F0',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#CCC',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
    backgroundColor: '#11111F',
    borderWidth: 1,
    borderColor: '#A020F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A020F0',
    borderRadius: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#A020F0',
  },
  categoryButtonText: {
    color: '#A020F0',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#11111F',
  },
  productTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  productSystem: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  productPrice: {
    color: '#A020F0',
    fontSize: 14,
    fontWeight: '700',
  },

toggle: {
  backgroundColor: '#1A1A1A',
  borderWidth: 1,
  borderColor: '#2A2A2A',
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 12,
},
toggleOn: {
  borderColor: '#A020F0',
},
toggleText: {
  color: '#EAEAEA',
  fontWeight: '600',
},
});
