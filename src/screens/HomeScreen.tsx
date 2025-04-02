import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { IRtcEngine } from 'react-native-agora';
import { Contact } from '../types';
import io from 'socket.io-client';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const { currentUser, agoraEngineRef } = route.params;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string>('testing');
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        const data = await response.json();
        // Filter out the current user from the contacts list
        const filteredContacts = data.filter(
          (contact: Contact) => contact.id !== currentUser.id
        );
        setContacts(filteredContacts);
        setError(null);
      } catch (err) {
        setError('Error fetching contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  useEffect(() => {
    // Set up header
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerContainer}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {currentUser.name[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerUserName}>{currentUser.name}</Text>
            <Text style={styles.headerUserPhone}>{currentUser.phone}</Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.replace('SelectUser')}
          style={styles.headerButton}
        >
          <Icon name="switch-account" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentUser]);

  const handleCallAction = async (
    contact: Contact,
    actionType: 'start' | 'join',
    isVideo: boolean
  ) => {
    try {
      // Enable audio/video based on call type
      if (isVideo) {
        agoraEngineRef.current?.enableVideo();
        agoraEngineRef.current?.enableLocalVideo(true);
      } else {
        agoraEngineRef.current?.enableAudio();
        agoraEngineRef.current?.enableLocalAudio(true);
        agoraEngineRef.current?.muteLocalAudioStream(false);
        agoraEngineRef.current?.muteAllRemoteAudioStreams(false);
      }

      const response = await fetch('http://localhost:3000/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: contact.id,
          name: contact.name,
          number: contact?.number || contact.phone,
          actionType: actionType,
          isVideoCall: isVideo,
          isVoiceCall: !isVideo,
          channelName: channelName,
          timestamp: new Date().toISOString(),
          callerId: currentUser.id,
          callerName: currentUser.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log call action');
      }

      // Navigate to appropriate screen
      if (isVideo) {
        navigation.navigate('VideoCall', {
          currentContact: contact,
          channelName,
          currentUser,
          agoraEngineRef,
          // onEndCall: () => navigation.goBack(),
        });
      } else {
        navigation.navigate('Call', {
          currentContact: contact,
          channelName,
          currentUser,
          agoraEngineRef,
          // onEndCall: () => navigation.goBack(),
        });
        // navigation.navigate('Call', {
        //   currentContact: contact,
        //   channelName: channelName,
        // });
      }
    } catch (err) {
      console.error('Error in handleCallAction:', err);
      Alert.alert(
        'Error',
        'Failed to initiate call. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.number}</Text>
      </View>
      <View style={styles.callButtons}>
        <TouchableOpacity
          onPress={() => {
            // agoraEngineRef.current?.enableAudio();
            // agoraEngineRef.current?.enableLocalAudio(true);
            // agoraEngineRef.current?.muteLocalAudioStream(false);
            // agoraEngineRef.current?.muteAllRemoteAudioStreams(false);
            handleCallAction(item, 'start', false);
          }}
          // disabled={isCalling}
          style={[styles.callButton, styles.audioCallButton]}
        >
          <Icon name="call" size={24} color={isCalling ? '#888' : '#075e54'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleCallAction(item, 'start', true)}
          // disabled={isCalling}
          style={[styles.callButton, styles.videoCallButton]}
        >
          <Icon name="videocam" size={24} color={isCalling ? '#888' : '#075e54'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Channel Name"
          value={channelName.toLowerCase()}
          onChangeText={(value) => setChannelName(value.toLowerCase())}
        />
        <View style={styles.joinButtons}>
          <TouchableOpacity
            style={[styles.joinButton, styles.audioJoinButton]}
            onPress={() => {
              agoraEngineRef.current?.enableAudio();
              agoraEngineRef.current?.enableLocalAudio(true);
              agoraEngineRef.current?.muteLocalAudioStream(false);
              agoraEngineRef.current?.muteAllRemoteAudioStreams(false);
              handleCallAction(currentUser, 'join', false);
            }}
          >
            <Icon name="call" size={24} color="#075e54" />
            <Text style={styles.joinButtonText}>Join Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.joinButton, styles.videoJoinButton]}
            onPress={() => {
              handleCallAction(currentUser, 'join', true);
            }}
          >
            <Icon name="videocam" size={24} color="#075e54" />
            <Text style={styles.joinButtonText}>Join Video</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.header}>Contacts</Text>
      {loading ? (
        <View style={styles.centerContent}>
          <Text>Loading contacts...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item: Contact) => item.id.toString()}
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginRight: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#075e54',
    color: 'white',
  },
  list: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  callButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    padding: 8,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  audioCallButton: {
    backgroundColor: '#e8f5e9',
  },
  videoCallButton: {
    backgroundColor: '#e3f2fd',
  },
  joinButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  joinButtonText: {
    marginLeft: 4,
    color: '#075e54',
    fontWeight: '600',
  },
  audioJoinButton: {
    backgroundColor: '#e8f5e9',
  },
  videoJoinButton: {
    backgroundColor: '#e3f2fd',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerUserInfo: {
    flex: 1,
  },
  headerUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerUserPhone: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  headerButton: {
    padding: 8,
  },
});

export default HomeScreen; 