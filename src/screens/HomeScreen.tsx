import React from 'react';
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

interface HomeScreenProps {
  channelName: string;
  setChannelName: (name: string) => void;
  agoraEngineRef: React.RefObject<IRtcEngine>;
  startCall: (contact: Contact) => void;
  startVideoCall: (contact: Contact) => void;
  joinCall: (contact: Contact) => void;
  isCalling: boolean;
  users?: []
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
  users
}) => {
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
            startCall(item);
          }}
          disabled={isCalling}
          style={[styles.callButton, styles.audioCallButton]}
        >
          <Icon name="call" size={24} color={isCalling ? '#888' : '#075e54'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => startVideoCall(item)}
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
      <FlatList
        data={users}
        renderItem={renderContact}
        keyExtractor={(item: Contact) => item.id.toString()}
        style={styles.list}
      />
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
});

export default HomeScreen; 