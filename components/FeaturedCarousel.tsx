import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ProductCard from './ProductCard';

const featuredProducts = [
  {
    id: '1',
    title: 'The Legend of Zelda: Ocarina of Time',
    system: 'N64',
    year: '1998',
    condition: 'Mint' as const,
    price: '$89.99',
  },
  {
    id: '2',
    title: 'Super Mario World',
    system: 'SNES',
    year: '1990',
    condition: 'Good' as const,
    price: '$45.99',
  },
  {
    id: '3',
    title: 'PlayStation 2 Slim Console',
    system: 'PS2',
    year: '2004',
    condition: 'Fair' as const,
    price: '$129.99',
  },
  {
    id: '4',
    title: 'Sonic the Hedgehog 2',
    system: 'Genesis',
    year: '1992',
    condition: 'Good' as const,
    price: '$34.99',
  },
  {
    id: '5',
    title: 'Metroid Prime',
    system: 'GameCube',
    year: '2002',
    condition: 'Mint' as const,
    price: '$79.99',
  },
];

export default function FeaturedCarousel() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Featured Items</Text>
        <Text style={styles.subtitle}>Retro treasures await</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {featuredProducts.map((product) => (
          <ProductCard
            key={product.id}
            title={product.title}
            system={product.system}
            year={product.year}
            condition={product.condition}
            price={product.price}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#A020F0',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
});
