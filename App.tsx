// App.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  TextInput,
  Button,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcConnection,
  RtcStats,
  AudioProfileType,
  AudioScenarioType,
} from 'react-native-agora';
import CallScreen from './src/components/CallScreen';
import VideoCallScreen from './src/components/VideoCallScreen';

// Replace with your Agora App ID
const APP_ID: string = '9ea47ffa5d624be09aa43318b934a590';

// Types
interface Contact {
  id: number;
  name: string;
  phone: string;
}

// Dummy contact list
const dummyContacts: Contact[] = [
  { id: 9, name: 'PV', phone: '+1234567890' },
];

const App: React.FC = () => {
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [userJoined, setUserJoined] = useState<boolean>(false);
  const [joinedUsers, setJoinedUsers] = useState<number[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<{ [key: number]: number }>({});
  const agoraEngineRef = useRef<IRtcEngine | null>(null);
  const [channelName, setChannelName] = useState<string>('testdcg');
  const [isVideoCall, setIsVideoCall] = useState<boolean>(false);

  useEffect(() => {
    setupVoiceSDKEngine();
    return () => {
      agoraEngineRef.current?.release();
    };
  }, []);

  const setupVoiceSDKEngine = async (): Promise<void> => {
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        console.warn('Cannot proceed without audio permission');
        return;
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      agoraEngine.initialize({
        appId: APP_ID,
      });

      // Set audio profile with better quality
      agoraEngine.setAudioProfile(
        AudioProfileType.AudioProfileSpeechStandard,
        AudioScenarioType.AudioScenarioChatroom
      );

      // Explicitly enable audio features
      agoraEngine.enableAudio();
      agoraEngine.enableLocalAudio(true);
      agoraEngine.setEnableSpeakerphone(true);
      agoraEngine.adjustRecordingSignalVolume(100);
      agoraEngine.adjustPlaybackSignalVolume(100);
      agoraEngine.muteLocalAudioStream(false);

      // Volume indication setup
      agoraEngine.enableAudioVolumeIndication(200, 3, true);


      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: (_connection: RtcConnection, uid: number) => {
          console.log('Successfully joined channel with UID:', uid);
          setIsCalling(true);
          setJoinedUsers(prev => [...prev, uid]);
        },
        onLeaveChannel: (_connection: RtcConnection, _stats: RtcStats) => {
          console.log('Left channel');
          setIsCalling(false);
          setCurrentContact(null);
          setUserJoined(false);
          setJoinedUsers([]);
          setSpeakingUsers({});
        },
        onUserJoined: (_connection: RtcConnection, uid: number) => {
          console.log('Remote user joined with UID:', uid);
          agoraEngine.muteRemoteAudioStream(uid, false);
          setUserJoined(true);
          setJoinedUsers(prevUsers => [...prevUsers, uid]);
        },
        onUserOffline: (_connection: RtcConnection, uid: number) => {
          console.log('User went offline:', uid);
          setJoinedUsers(prevUsers => prevUsers.filter(id => id !== uid));
        },
        onAudioVolumeIndication: (
          connection: RtcConnection,
          speakers: { uid: number; volume: number }[],
          speakerNumber: number,
          totalVolume: number
        ) => {
          console.log('Volume indication:', {
            speakers,
            speakerNumber,
            totalVolume
          });
          const newSpeakingUsers = { ...speakingUsers };

          // Reset all volumes
          Object.keys(newSpeakingUsers).forEach(key => {
            newSpeakingUsers[Number(key)] = 0;
          });

          // Update volumes for currently speaking users
          speakers.forEach(speaker => {
            if (speaker.volume > 5) { // Minimum threshold to consider as speaking
              newSpeakingUsers[speaker.uid] = speaker.volume;
            }
          });

          setSpeakingUsers(newSpeakingUsers);
        },
        onError: (err: number) => {
          console.warn('Agora Error:', err);
        },
      });

    } catch (e) {
      console.error('Setup error:', e);
    }
  };

  const joinCall = async (contact: Contact): Promise<void> => {
    try {
      const agoraEngine = agoraEngineRef.current;
      console.log(agoraEngine, "===", (agoraEngine && channelName));
      if (agoraEngine && channelName) {
        // Set a default contact for group calls
        setCurrentContact(contact);
        
        agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        agoraEngine.enableAudio();
        agoraEngine.enableLocalAudio(true);
        agoraEngine.muteLocalAudioStream(false);
        agoraEngine.muteAllRemoteAudioStreams(false);

        agoraEngine.joinChannel(
          '007eJxTYPh6djPrIdH6j3V84oyb79xn/5yZuPXLtWPfV0nPjPJRERdXYLBMTTQxT0tLNE0xMzJJSjWwTEw0MTY2tEiyNDZJNLU0cP/8JL0hkJHB9rcfAyMUgvjsDCWpxSUpyekMDAAMpCHU',
          channelName,
          contact.id,
          {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          }
        );
      }
    } catch (e) {
      console.log('Join call error:', e);
      setCurrentContact(null);
    }
  };

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs access to your microphone for voice calls',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startCall = async (contact: Contact): Promise<void> => {
    try {
      setCurrentContact(contact);
      const agoraEngine = agoraEngineRef.current;

      if (agoraEngine) {
        agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        agoraEngine.joinChannel(
          '007eJxTYPh6djPrIdH6j3V84oyb79xn/5yZuPXLtWPfV0nPjPJRERdXYLBMTTQxT0tLNE0xMzJJSjWwTEw0MTY2tEiyNDZJNLU0cP/8JL0hkJHB9rcfAyMUgvjsDCWpxSUpyekMDAAMpCHU',
          channelName,
          contact.id,
          {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          }
        );
      }
    } catch (e) {
      console.log('Call error:', e);
    }
  };

  const startVideoCall = async (contact: Contact): Promise<void> => {
    try {
      setCurrentContact(contact);
      setIsVideoCall(true);
      const agoraEngine = agoraEngineRef.current;

      if (agoraEngine) {
        agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        agoraEngine.enableVideo();
        agoraEngine.enableLocalVideo(true);
        
        agoraEngine.joinChannel(
          '007eJxTYPh6djPrIdH6j3V84oyb79xn/5yZuPXLtWPfV0nPjPJRERdXYLBMTTQxT0tLNE0xMzJJSjWwTEw0MTY2tEiyNDZJNLU0cP/8JL0hkJHB9rcfAyMUgvjsDCWpxSUpyekMDAAMpCHU',
          channelName,
          contact.id,
          {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          }
        );
      }
    } catch (e) {
      console.log('Video call error:', e);
      setIsVideoCall(false);
    }
  };

  const endCall = (): void => {
    try {
      if (agoraEngineRef.current) {
        if (isVideoCall) {
          agoraEngineRef.current.disableVideo();
        }
        agoraEngineRef.current.leaveChannel();
        setIsCalling(false);
        setIsVideoCall(false);
        setCurrentContact(null);
        setUserJoined(false);
        setJoinedUsers([]);
      }
    } catch (e) {
      console.log('End call error:', e);
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
            startCall(item)
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

  if (isCalling) {
    if (isVideoCall) {
      return (
        <VideoCallScreen
          currentContact={currentContact}
          joinedUsers={joinedUsers}
          onEndCall={endCall}
          channelName={channelName}
          speakingUsers={speakingUsers}
          agoraEngineRef={agoraEngineRef as React.RefObject<IRtcEngine>}
        />
      );
    }
    return (
      <CallScreen
        currentContact={currentContact}
        joinedUsers={joinedUsers}
        onEndCall={endCall}
        channelName={channelName}
        speakingUsers={speakingUsers}
        agoraEngineRef={agoraEngineRef as React.RefObject<IRtcEngine>}
      />
    );
  }

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
              joinCall({ id: 8, name: 'DV', phone: '9876543210' })
            }}
          >
            <Icon name="call" size={24} color="#075e54" />
            <Text style={styles.joinButtonText}>Join Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.joinButton, styles.videoJoinButton]}
            onPress={() => {
              startVideoCall({ id: 8, name: 'DV', phone: '9876543210' })
            }}
          >
            <Icon name="videocam" size={24} color="#075e54" />
            <Text style={styles.joinButtonText}>Join Video</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.header}>Contacts</Text>
      <FlatList
        data={dummyContacts}
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

export default App;