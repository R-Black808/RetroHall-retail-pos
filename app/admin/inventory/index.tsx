import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Product } from '@/lib/supabase';
import { Star, TriangleAlert, Minus, Plus, RefreshCcw } from 'lucide-react-native';

type Filter = 'all' | 'low' | 'featured';

const csvColumns = [
  'id',
  'sku',
  'barcode',
  'title',
  'system',
  'category',
  'condition',
  'price',
  'cost_price',
  'supplier',
  'stock_qty',
  'low_stock_threshold',
  'featured',
  'image_url',
  'description',
] as const;

const normalizeBool = (v: any) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
};

const normalizeNumber = (v: any) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function AdminInventory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const [thresholdEdits, setThresholdEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (isAdmin) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const checkAdmin = async () => {
    if (!user?.id) {
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
      setIsAdmin(!!data);
    } catch (e) {
      console.error('Error checking admin:', e);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const list = (data || []) as Product[];
      setProducts(list);

      // seed edit maps
      const stockSeed: Record<string, string> = {};
      const thrSeed: Record<string, string> = {};
      for (const p of list) {
        stockSeed[p.id] = String(p.stock_qty ?? 0);
        thrSeed[p.id] = String(p.low_stock_threshold ?? 3);
      }
      setStockEdits(stockSeed);
      setThresholdEdits(thrSeed);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const stock = p.stock_qty ?? 0;
      const thr = p.low_stock_threshold ?? 3;
      const isLow = stock <= thr;
      const isFeat = !!p.featured;

      const matchesFilter =
        filter === 'all' ? true : filter === 'low' ? isLow : filter === 'featured' ? isFeat : true;

      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.system.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [products, filter, search]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.stock_qty ?? 0) <= (p.low_stock_threshold ?? 3)).length;
  }, [products]);

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    try {
      setSavingId(id);
      const { error } = await supabase.from('products').update(patch).eq('id', id);
      if (error) throw error;

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    } catch (e: any) {
      console.error('Update product error:', e);
      Alert.alert('Update failed', e?.message || 'Could not update product.');
    } finally {
      setSavingId(null);
    }
  };

  const bumpStock = async (p: Product, delta: number) => {
    const current = p.stock_qty ?? 0;
    const next = Math.max(0, current + delta);
    setStockEdits((m) => ({ ...m, [p.id]: String(next) }));
    await updateProduct(p.id, { stock_qty: next });
  };

  const saveEdits = async (p: Product) => {
    const rawStock = stockEdits[p.id] ?? String(p.stock_qty ?? 0);
    const rawThr = thresholdEdits[p.id] ?? String(p.low_stock_threshold ?? 3);

    const stock = Math.max(0, parseInt(rawStock || '0', 10) || 0);
    const thr = Math.max(0, parseInt(rawThr || '0', 10) || 0);

    await updateProduct(p.id, { stock_qty: stock, low_stock_threshold: thr });
  };

  const toggleFeatured = async (p: Product) => {
    await updateProduct(p.id, { featured: !p.featured });
  };

  const handleExportCsv = async () => {
    try {
      if (!products.length) {
        Alert.alert('Nothing to export', 'No products found.');
        return;
      }

      const rows = products.map((p: any) => {
        const row: Record<string, any> = {};
        csvColumns.forEach((k) => (row[k] = p[k] ?? ''));
        return row;
      });

      const csv = Papa.unparse(rows, { columns: [...csvColumns] as any });
      const filename = `retrohall_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Exported', `CSV saved to cache: ${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Inventory CSV' });
    } catch (e: any) {
      console.error('Export CSV error:', e);
      Alert.alert('Export failed', e?.message || 'Unable to export CSV.');
    }
  };

  const handleImportCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      });
      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      const csv = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });

      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      if (parsed.errors?.length) {
        console.warn('CSV parse errors:', parsed.errors);
      }

      const data = (parsed.data as any[]).filter(Boolean);

      if (!data.length) {
        Alert.alert('No rows found', 'Your CSV had no data rows.');
        return;
      }

      const upserts = data.map((r) => {
        const row: any = {};

        if (r.id) row.id = String(r.id).trim();
        if (r.sku) row.sku = String(r.sku).trim();
        if (r.barcode) row.barcode = String(r.barcode).trim();

        row.title = String(r.title ?? '').trim();
        row.system = String(r.system ?? '').trim();
        row.category = String(r.category ?? '').trim();
        row.condition = String(r.condition ?? 'Good').trim() || 'Good';
        row.description = String(r.description ?? '').trim();
        row.image_url = String(r.image_url ?? '').trim() || null;

        row.price = normalizeNumber(r.price) ?? 0;
        row.cost_price = normalizeNumber(r.cost_price);
        row.supplier = String(r.supplier ?? '').trim() || null;

        row.stock_qty = normalizeNumber(r.stock_qty) ?? 0;
        row.low_stock_threshold = normalizeNumber(r.low_stock_threshold) ?? 3;
        row.featured = normalizeBool(r.featured);

        return row;
      });

      const invalid = upserts.find((u) => !u.title || !u.system || !u.category);
      if (invalid) {
        Alert.alert('Import error', 'Each row must include title, system, and category.');
        return;
      }

      // Prefer onConflict sku if present; otherwise fallback to id.
      const anySku = upserts.some((u) => u.sku);
      const onConflict = anySku ? 'sku' : 'id';

      const { error } = await supabase
        .from('products')
        .upsert(upserts, { onConflict, ignoreDuplicates: false });

      if (error) throw error;

      Alert.alert('Import complete', `Upserted ${upserts.length} product(s).`);
      fetchProducts();
    } catch (e: any) {
      console.error('Import CSV error:', e);
      Alert.alert('Import failed', e?.message || 'Unable to import CSV.');
    }
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

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Admin Access Required</Text>
          <Text style={styles.deniedSub}>You don't have permission to access inventory tools.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#11111F', '#0B0B14']} style={styles.gradient}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>Low-stock: {lowStockCount}</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton} onPress={handleImportCsv}>
                <Text style={styles.iconButtonText}>Import CSV</Text>
              </Pressable>
              <Pressable style={styles.iconButton} onPress={handleExportCsv}>
                <Text style={styles.iconButtonText}>Export CSV</Text>
              </Pressable>
            </View>

            <Pressable style={styles.refresh} onPress={fetchProducts}>
              <RefreshCcw size={18} color="#A020F0" />
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filters}>
          {(['all', 'low', 'featured'] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'low' ? 'Low stock' : 'Featured'}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          placeholder="Search products..."
          placeholderTextColor="#6B7280"
          style={styles.search}
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const stock = item.stock_qty ?? 0;
            const thr = item.low_stock_threshold ?? 3;
            const isLow = stock <= thr;
            const isSaving = savingId === item.id;

            return (
              <LinearGradient colors={['#11111F', '#1A1A2E']} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.featured ? (
                        <View style={styles.badge}>
                          <Star size={14} color="#FFD700" />
                          <Text style={styles.badgeText}>Featured</Text>
                        </View>
                      ) : null}
                      {isLow ? (
                        <View style={[styles.badge, styles.lowBadge]}>
                          <TriangleAlert size={14} color="#F59E0B" />
                          <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Low</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.meta}>
                      {item.category} • {item.system} • {item.condition}
                    </Text>
                  </View>

                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder} />
                  )}
                </View>

                <View style={styles.stockRow}>
                  <View style={styles.stockBox}>
                    <Text style={styles.label}>Stock</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={stockEdits[item.id] ?? String(stock)}
                      onChangeText={(t) => setStockEdits((m) => ({ ...m, [item.id]: t.replace(/[^0-9]/g, '') }))}
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.stockBox}>
                    <Text style={styles.label}>Low @</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={thresholdEdits[item.id] ?? String(thr)}
                      onChangeText={(t) =>
                        setThresholdEdits((m) => ({ ...m, [item.id]: t.replace(/[^0-9]/g, '') }))
                      }
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.bumpCol}>
                    <Pressable style={styles.bumpBtn} onPress={() => bumpStock(item, -1)} disabled={isSaving}>
                      <Minus size={16} color="#E5E7EB" />
                    </Pressable>
                    <Pressable style={styles.bumpBtn} onPress={() => bumpStock(item, +1)} disabled={isSaving}>
                      <Plus size={16} color="#E5E7EB" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionBtn, item.featured && styles.actionBtnActive]}
                    onPress={() => toggleFeatured(item)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.actionText, item.featured && styles.actionTextActive]}>
                      {item.featured ? 'Unfeature' : 'Feature'}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.actionBtn} onPress={() => saveEdits(item)} disabled={isSaving}>
                    <Text style={styles.actionText}>{isSaving ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: 32, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF' }}>No products found.</Text>
            </View>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11111F' },
  gradient: { flex: 1, padding: 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  deniedSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerRight: { alignItems: 'flex-end', gap: 10 },

  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { marginTop: 4, color: '#9CA3AF' },

  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    backgroundColor: '#0B0B14',
  },
  iconButtonText: { color: '#EAEAEA', fontWeight: '800', fontSize: 12 },

  refresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  refreshText: { color: '#A020F0', fontWeight: '700' },

  filters: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  filterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  filterBtnActive: { borderColor: '#A020F0' },
  filterText: { color: '#9CA3AF', fontWeight: '700' },
  filterTextActive: { color: '#fff' },

  search: {
    backgroundColor: '#0B0B14',
    borderRadius: 14,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2A2A3A',
    marginBottom: 12,
  },

  card: { borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A3A' },
  rowTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16, maxWidth: 210 },
  meta: { color: '#9CA3AF', marginTop: 4 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  lowBadge: { borderColor: '#F59E0B' },
  badgeText: { color: '#E5E7EB', fontWeight: '700', fontSize: 12 },

  thumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#0B0B14' },
  thumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },

  stockRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 },
  stockBox: {
    flex: 1,
    backgroundColor: '#0B0B14',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  label: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  input: { marginTop: 6, color: '#fff', fontSize: 16, fontWeight: '800' },

  bumpCol: { gap: 10 },
  bumpBtn: {
    width: 40,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#2A2A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0B0B14',
    borderWidth: 1,
    borderColor: '#2A2A3A',
    alignItems: 'center',
  },
  actionBtnActive: { borderColor: '#A020F0' },
  actionText: { color: '#E5E7EB', fontWeight: '800' },
  actionTextActive: { color: '#A020F0' },
});