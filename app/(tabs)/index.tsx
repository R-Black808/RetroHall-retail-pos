import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ShoppingCart,
  Search,
  Gamepad2,
  Tv,
  Headphones,
  Package,
  ArrowRight,
} from 'lucide-react-native';
import FeaturedCarousel from '@/components/FeaturedCarousel';

const categories = [
  { id: '1', name: 'Games', icon: Gamepad2 },
  { id: '2', name: 'Consoles', icon: Tv },
  { id: '3', name: 'Accessories', icon: Headphones },
  { id: '4', name: 'Collectibles', icon: Package },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topNav}>
          <Text style={styles.logo}>RETRO HALL</Text>
          <View style={styles.topNavIcons}>
            <Pressable style={styles.iconButton}>
              <Bell size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <ShoppingCart size={24} color="#FFFFFF" strokeWidth={2} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>3</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#A020F0" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search retro games..."
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.featuredPromo}>
          <LinearGradient
            colors={['#6A0DAD', '#A020F0', '#FF286A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}>
            <View style={styles.promoContent}>
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>LIMITED TIME</Text>
              </View>
              <Text style={styles.promoHeadline}>
                Trade & Save on Retro Bundles
              </Text>
              <Text style={styles.promoSubtext}>
                Get up to 50% extra credit on your trade-ins
              </Text>
              <Pressable style={styles.promoButton}>
                <Text style={styles.promoButtonText}>View Offers</Text>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
            <View style={styles.promoGlow} />
          </LinearGradient>
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}>
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Pressable key={category.id} style={styles.categoryCard}>
                  <View style={styles.categoryIconContainer}>
                    <Icon size={32} color="#A020F0" strokeWidth={2} />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FeaturedCarousel />

        <View style={styles.ctaSection}>
          <LinearGradient
            colors={['#11111F', '#1A1A2E']}
            style={styles.ctaCard}>
            <View style={styles.ctaBadge}>
              <Text style={styles.ctaBadgeText}>SELL TO RETRO HALL</Text>
            </View>
            <Text style={styles.ctaHeadline}>
              Turn your old games into instant credit
            </Text>
            <Text style={styles.ctaSubtext}>
              Fast quotes, free shipping, and competitive prices
            </Text>
            <Pressable style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Start a trade-in</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={3} />
            </Pressable>
            <View style={styles.ctaGlow} />
          </LinearGradient>
        </View>

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
  scrollView: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: '#A020F0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  topNavIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF286A',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11111F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#A020F0',
    shadowColor: '#A020F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  featuredPromo: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  promoCard: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF286A',
  },
  promoContent: {
    position: 'relative',
    zIndex: 2,
  },
  promoBadge: {
    backgroundColor: '#FFFFFF22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  promoHeadline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 34,
  },
  promoSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 20,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
  },
  promoButtonText: {
    color: '#6A0DAD',
    fontSize: 16,
    fontWeight: '700',
  },
  promoGlow: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    backgroundColor: '#FF286A',
    opacity: 0.2,
    borderRadius: 100,
    zIndex: 1,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#11111F',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A020F0',
    shadowColor: '#A020F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 120,
  },
  categoryIconContainer: {
    marginBottom: 12,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#A020F0',
    shadowColor: '#A020F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBadge: {
    backgroundColor: '#A020F022',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  ctaBadgeText: {
    color: '#A020F0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ctaHeadline: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 30,
  },
  ctaSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A020F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
    shadowColor: '#A020F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ctaGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    backgroundColor: '#A020F0',
    opacity: 0.15,
    borderRadius: 100,
  },
  bottomSpacer: {
    height: 40,
  },
});
