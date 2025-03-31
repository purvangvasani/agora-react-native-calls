import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { IRtcEngine } from 'react-native-agora';
import { Contact } from '../types';

interface HomeScreenProps {
  agoraEngineRef: React.RefObject<IRtcEngine>;
  setChannelName: (name: string) => void;
  setCurrentContact: (contact: Contact | null) => void;
}

const dummyContacts: Contact[] = [
  { id: 1, name: 'John Doe', phone: '+1234567890' },
  { id: 2, name: 'Jane Smith', phone: '+0987654321' },
  { id: 3, name: 'Alice Johnson', phone: '+1122334455' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({
  agoraEngineRef,
  setChannelName,
  setCurrentContact,
}) => {
  const [channelInput, setChannelInput] = useState('');

  const startCall = async (contact: Contact, isVideo: boolean = false) => {
    if (!channelInput.trim()) {
      Alert.alert('Please enter a channel name');
      return;
    }

    setChannelName(channelInput);
    setCurrentContact(contact);

    const agoraEngine = agoraEngineRef.current;
    if (!agoraEngine) return;

    if (isVideo) {
      agoraEngine.enableVideo();
      agoraEngine.enableLocalVideo(true);
      agoraEngine.startPreview();
    } else {
      agoraEngine.enableAudio();
      agoraEngine.enableLocalAudio(true);
    }

    // navigation.navigate(isVideo ? 'VideoCall' : 'Call', {
    //   currentContact: contact,
    //   joinedUsers: [0], // Local user
    //   channelName: channelInput,
    //   speakingUsers: {},
    //   agoraEngineRef,
    //   onEndCall: () => {
    //     navigation.navigate('Home');
    //   },
    // });
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.callButtons}>
        <TouchableOpacity
          style={[styles.callButton, styles.audioCallButton]}
          onPress={() => startCall(item)}>
          <Icon name="call" size={24} color="#075e54" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.callButton, styles.videoCallButton]}
          onPress={() => startCall(item, true)}>
          <Icon name="videocam" size={24} color="#075e54" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Voice & Video Call App</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter channel name"
          value={channelInput}
          onChangeText={setChannelInput}
        />
      </View>
      <FlatList
        style={styles.list}
        data={dummyContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#075e54',
    color: 'white',
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
    borderRadius: 8,
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
});

export default HomeScreen; 