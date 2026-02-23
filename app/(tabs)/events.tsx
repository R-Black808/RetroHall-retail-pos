import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Users, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  max_attendees: number;
  image_url: string;
  game_type: string;
  created_by: string;
}

interface EventWithParticipants extends Event {
  participant_count: number;
  is_joined: boolean;
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      const enrichedEvents: EventWithParticipants[] = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: attendees } = await supabase
            .from('event_attendees')
            .select('id')
            .eq('event_id', event.id);

          const { data: joined } = await supabase
            .from('event_attendees')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          return {
            ...event,
            participant_count: attendees?.length || 0,
            is_joined: !!joined,
          };
        })
      );

      setEvents(enrichedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to fetch events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user.id,
      });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Event Joined!',
        message: 'You have successfully joined an event.',
        type: 'event',
        related_id: eventId,
      });

      Alert.alert('Success', 'You joined the event!');
      fetchEvents();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    Alert.alert('Leave Event', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Leave',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('event_attendees')
              .delete()
              .eq('event_id', eventId)
              .eq('user_id', user.id);

            if (error) throw error;
            Alert.alert('Success', 'You left the event');
            fetchEvents();
          } catch (error) {
            Alert.alert('Error', 'Failed to leave event');
          }
        },
      },
    ]);
  };

  const renderEventCard = ({ item }: { item: EventWithParticipants }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/events/[id]',
          params: { id: item.id },
        })
      }
      style={styles.eventCard}>
      <LinearGradient
        colors={['#6A0DAD', '#A020F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.is_joined && (
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            )}
          </View>

          <Text style={styles.gameType}>{item.game_type}</Text>

          <View style={styles.eventDetails}>
            <View style={styles.detailItem}>
              <Calendar size={16} color="#00E5FF" strokeWidth={2} />
              <Text style={styles.detailText}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MapPin size={16} color="#00E5FF" strokeWidth={2} />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Users size={16} color="#00E5FF" strokeWidth={2} />
              <Text style={styles.detailText}>
                {item.participant_count}/{item.max_attendees}
              </Text>
            </View>
          </View>

          {!item.is_joined ? (
            <Pressable
              onPress={() => handleJoinEvent(item.id)}
              style={styles.joinButton}>
              <LinearGradient
                colors={['#FF286A', '#A020F0']}
                style={styles.joinButtonGradient}>
                <Text style={styles.joinButtonText}>Join Event</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => handleLeaveEvent(item.id)}
              style={styles.leaveButton}>
              <Text style={styles.leaveButtonText}>Leave Event</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Discover card game tournaments</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A020F0" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.eventsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents();
              }}
              tintColor="#A020F0"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Calendar size={48} color="#A020F0" strokeWidth={1} />
              <Text style={styles.emptyText}>No events yet</Text>
              <Text style={styles.emptySubtext}>
                Check back soon for upcoming tournaments
              </Text>
            </View>
          }
        />
      )}
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
  eventsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  eventCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A020F0',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  joinedBadge: {
    backgroundColor: '#00E5FF22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  joinedText: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '700',
  },
  gameType: {
    color: '#FF286A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  joinButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  leaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF286A',
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#FF286A',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});
