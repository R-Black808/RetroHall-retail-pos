import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProductCardProps {
  title: string;
  system: string;
  year: string;
  condition: 'Mint' | 'Good' | 'Fair' | 'Poor';
  price: string;
  onPress?: () => void;
}

export default function ProductCard({
  title,
  system,
  year,
  condition,
  price,
  onPress,
}: ProductCardProps) {
  const getConditionColor = () => {
    switch (condition) {
      case 'Mint':
        return '#00E5FF';
      case 'Good':
        return '#00FF00';
      case 'Fair':
        return '#FFD700';
      case 'Poor':
        return '#FF286A';
      default:
        return '#666';
    }
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        <LinearGradient
          colors={['#6A0DAD', '#A020F0', '#FF286A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.imagePlaceholder}>
          <View style={styles.crtEffect}>
            <View style={styles.scanline} />
            <Text style={styles.imagePlaceholderText}>CRT</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.system}>{system}</Text>
          <Text style={styles.year}>{year}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View
            style={[
              styles.conditionBadge,
              { backgroundColor: getConditionColor() + '22' },
            ]}>
            <Text style={[styles.conditionText, { color: getConditionColor() }]}>
              {condition}
            </Text>
          </View>

          <Text style={styles.price}>{price}</Text>
        </View>

        <View style={styles.statBar}>
          <View
            style={[
              styles.statBarFill,
              {
                width:
                  condition === 'Mint'
                    ? '100%'
                    : condition === 'Good'
                    ? '75%'
                    : condition === 'Fair'
                    ? '50%'
                    : '25%',
                backgroundColor: getConditionColor(),
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: '#11111F',
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#A020F0',
    shadowColor: '#A020F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crtEffect: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanline: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: '50%',
  },
  imagePlaceholderText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    opacity: 0.3,
  },
  content: {
    padding: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    height: 36,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  system: {
    color: '#A020F0',
    fontSize: 11,
    fontWeight: '600',
  },
  year: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  price: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#0A0014',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
