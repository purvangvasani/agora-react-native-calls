import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { IRtcEngine } from 'react-native-agora';
import { Contact } from '../types';
import io from 'socket.io-client';
const socket = io("http://localhost:3000");

interface HomeScreenProps {
  channelName: string;
  setChannelName: (name: string) => void;
  agoraEngineRef: React.RefObject<IRtcEngine>;
  startCall: (contact: Contact) => void;
  startVideoCall: (contact: Contact) => void;
  joinCall: (contact: Contact) => void;
  isCalling: boolean;
}

const dummyContacts: Contact[] = [
  { id: 9, name: 'PV', phone: '+1234567890' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({
  channelName,
  setChannelName,
  agoraEngineRef,
  startCall,
  startVideoCall,
  joinCall,
  isCalling,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      console.log(data);
    });
    const fetchContacts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        const data = await response.json();
        setContacts(data);
        setError(null);
      } catch (err) {
        setError('Error fetching contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCallAction = async (
    contact: Contact,
    actionType: 'start' | 'join',
    isVideo: boolean
  ) => {
    try {
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log call action');
      }

      // After successful API call, proceed with the actual call
      if (actionType === 'start') {
        if (isVideo) {
          startVideoCall(contact);
        } else {
          startCall(contact);
          // socket.emit("send_message", {
          //   message: "Hello, how are you?",
          //   senderId: 1,
          //   receiverId: contact.id,
          // });
        }
      } else {
        joinCall(contact);
      }
    } catch (err) {
      console.error('Error logging call action:', err);
      // Still proceed with the call even if logging fails
      if (actionType === 'start') {
        if (isVideo) {
          startVideoCall(contact);
        } else {
          startCall(contact);
          // socket.emit("send_message", {
          //   message: "Hello, how are you?",
          //   senderId: 1,
          //   receiverId: contact.id,
          // });
        }
      } else {
        joinCall(contact);
      }
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.callButtons}>
        <TouchableOpacity
          onPress={() => {
            agoraEngineRef.current?.enableAudio();
            agoraEngineRef.current?.enableLocalAudio(true);
            agoraEngineRef.current?.muteLocalAudioStream(false);
            agoraEngineRef.current?.muteAllRemoteAudioStreams(false);
            // socket.emit("send_message", {
            //   message: "Hello, how are you?",
            //   senderId: 1,
            //   receiverId: item.id,
            // });
            handleCallAction(item, 'start', false);
          }}
          disabled={isCalling}
          style={[styles.callButton, styles.audioCallButton]}
        >
          <Icon name="call" size={24} color={isCalling ? '#888' : '#075e54'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleCallAction(item, 'start', true)}
          disabled={isCalling}
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
              joinCall({ id: 8, name: 'DV', phone: '9876543210' });
            }}
          >
            <Icon name="call" size={24} color="#075e54" />
            <Text style={styles.joinButtonText}>Join Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.joinButton, styles.videoJoinButton]}
            onPress={() => {
              startVideoCall({ id: 8, name: 'DV', phone: '9876543210' });
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
});

export default HomeScreen; 