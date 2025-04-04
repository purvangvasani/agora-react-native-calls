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
  Alert,
  ActivityIndicator,
  Modal,
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
import { Contact } from './src/types';
import CallScreen from './src/components/CallScreen';
import VideoCallScreen from './src/components/VideoCallScreen';
import HomeScreen from './src/screens/HomeScreen';
import io from 'socket.io-client';

// Replace process.env variables with direct values
const APP_ID = '9ea47ffa5d624be09aa43318b934a590';
const APP_TOKEN = '007eJxTYHhSP0v44LrAUAWZe3UrWTU/P2aR7LV2fHdzb3vb4SCZXlkFBsvURBPztLRE0xQzI5OkVAPLxEQTY2NDiyRLY5NEU0uDCRHv0xsCGRmm5a5gZGSAQBCfnaEktbgkMy+dgQEAliwglg==';
const DEFAULT_CHANNEL_NAME = 'testing';

const App: React.FC = () => {
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [userJoined, setUserJoined] = useState<boolean>(false);
  const [joinedUsers, setJoinedUsers] = useState<number[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<{ [key: number]: number }>({});
  const agoraEngineRef = useRef<IRtcEngine>(null!);
  const selectedUserRef = useRef<Contact | null>(null);
  const [channelName, setChannelName] = useState<string>(DEFAULT_CHANNEL_NAME);
  const [isVideoCall, setIsVideoCall] = useState<boolean>(false);
  const socket = io('http://192.168.10.221:3000');
  const [users, setUsers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Contact | null>(null);
  const [filteredUser, setFilteredUser] = useState<any | []>([]);
  const [isUserSelected, setIsUserSelected] = useState<boolean>(false);
  const [isPickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      fetchUsers();
    });
    
    // Remove the existing socket listener if it exists
    socket.off('incomingCall123');
    
    // Add the new listener with access to the latest selectedUser via ref
    socket.on('incomingCall123', async (data: any) => {
      console.log('Incoming call 123 from:', data, currentContact, selectedUserRef.current);
      if (data?.receiver.id === selectedUserRef.current?.id) {
        Alert.alert('INCOMING CALL')
        joinCall(data?.caller)
      }
    });

    socket.emit('send_message', 'Hello from client');

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    if (!APP_ID) {
      console.error('Agora App ID is missing!');
      return;
    }
    setupVoiceSDKEngine();
    return () => {
      socket.disconnect();
      if (agoraEngineRef.current) {
        agoraEngineRef.current.release();
      }
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://192.168.10.221:3000/api/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
      if (data.length > 0 && !selectedUser) {
        setSelectedUser(data[0]);
        const filteredContacts = data.filter(
          (contact: Contact) => contact.id !== data[0].id
        );
        setFilteredUser(filteredContacts);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const audioGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs access to your microphone for voice calls',
          buttonPositive: 'OK',
        }
      );

      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera for video calls',
          buttonPositive: 'OK',
        }
      );

      return (
        audioGranted === PermissionsAndroid.RESULTS.GRANTED &&
        cameraGranted === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  };

  const setupVoiceSDKEngine = async (): Promise<void> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.warn('Cannot proceed without required permissions');
        return;
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      agoraEngine.initialize({
        appId: APP_ID || '',
      });

      // Set audio profile with better quality
      agoraEngine.setAudioProfile(
        AudioProfileType.AudioProfileSpeechStandard,
        AudioScenarioType.AudioScenarioChatroom
      );

      // Register event handlers first
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
          setIsVideoCall(false);
        },
        onUserJoined: (_connection: RtcConnection, uid: number) => {
          console.log('Remote user joined with UID:', uid);
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
          const newSpeakingUsers = { ...speakingUsers };
          Object.keys(newSpeakingUsers).forEach(key => {
            newSpeakingUsers[Number(key)] = 0;
          });
          speakers.forEach(speaker => {
            if (speaker.volume > 5) {
              newSpeakingUsers[speaker.uid] = speaker.volume;
            }
          });
          setSpeakingUsers(newSpeakingUsers);
        },
        onError: (err: number) => {
          console.warn('Agora Error:', err);
        },
      });

      // Initialize audio features
      agoraEngine.enableAudio();
      agoraEngine.enableLocalAudio(true);
      agoraEngine.setEnableSpeakerphone(true);
      agoraEngine.adjustRecordingSignalVolume(100);
      agoraEngine.adjustPlaybackSignalVolume(100);
      agoraEngine.muteLocalAudioStream(false);
      agoraEngine.enableAudioVolumeIndication(200, 3, true);

    } catch (e) {
      console.error('Setup error:', e);
    }
  };

  const joinCall = async (contact: Contact): Promise<void> => {
    try {
      const agoraEngine = agoraEngineRef.current;
      if (agoraEngine && channelName) {
        // setCurrentContact(contact);

        agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        agoraEngine.enableAudio();
        agoraEngine.enableLocalAudio(true);
        agoraEngine.muteLocalAudioStream(false);
        agoraEngine.muteAllRemoteAudioStreams(false);

        await agoraEngine.joinChannel(
          APP_TOKEN,
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

  const startCall = async (contact: Contact, current: any): Promise<void> => {
    try {
      if (!selectedUser?.name) {
        setSelectedUser(current)
      }
      // Log the call
      const response = await fetch('http://192.168.10.221:3000/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: contact.id,
          name: contact.name,
          number: contact.phone || contact?.number,
          // actionType: actionType,
          isVideoCall: false,
          isVoiceCall: true,
          channelName: channelName,
          timestamp: new Date().toISOString(),
          callerId: selectedUser?.id,
          callerName: selectedUser?.name,
          currentContact: contact,
          currentUser: selectedUser,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log call action');
      }
      setCurrentContact(contact);
      const agoraEngine = agoraEngineRef.current;

      if (agoraEngine) {
        agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
        await agoraEngine.joinChannel(
          APP_TOKEN,
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
      const agoraEngine = agoraEngineRef.current;
      if (!agoraEngine) return;

      setCurrentContact(contact);
      setIsVideoCall(true);

      agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

      // Enable video before joining
      agoraEngine.enableVideo();
      agoraEngine.enableLocalVideo(true);
      agoraEngine.startPreview();

      await agoraEngine.joinChannel(
        APP_TOKEN,
        channelName,
        contact.id,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        }
      );
    } catch (e) {
      console.log('Video call error:', e);
      setIsVideoCall(false);
      setCurrentContact(null);
    }
  };

  const endCall = async (): Promise<void> => {
    try {
      const agoraEngine = agoraEngineRef.current;
      if (!agoraEngine) return;

      if (isVideoCall) {
        agoraEngine.stopPreview();
        agoraEngine.disableVideo();
      }
      await agoraEngine.leaveChannel();

      setIsCalling(false);
      setIsVideoCall(false);
      setCurrentContact(null);
      setUserJoined(false);
      setJoinedUsers([]);
    } catch (e) {
      console.log('End call error:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075e54" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isCalling) {
    if (isVideoCall) {
      return (
        <VideoCallScreen
          currentContact={currentContact}
          joinedUsers={joinedUsers}
          onEndCall={endCall}
          channelName={channelName}
          speakingUsers={speakingUsers}
          agoraEngineRef={agoraEngineRef}
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
        agoraEngineRef={agoraEngineRef}
      />
    );
  }

  const handleUserSelect = (user: Contact) => {
    setSelectedUser(user);
    const filteredContacts = users.filter(
      (contact: Contact) => contact.id !== user.id
    );
    setFilteredUser(filteredContacts)
    setPickerVisible(false);
  };

  const handleSubmit = () => {
    setIsUserSelected(true);
    // if (selectedUser) {
    //   navigation.replace('Home', {
    //     currentUser: selectedUser,
    //     agoraEngineRef: agoraEngineRef
    //   });
    // }
  };

  const renderUserItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUser?.id === item.id && styles.selectedUserItem
      ]}
      onPress={() => handleUserSelect(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userPhone}>{item.phone}</Text>
      </View>
      {selectedUser?.id === item.id && (
        <Icon name="check-circle" size={24} color="#075e54" />
      )}
    </TouchableOpacity>
  );
  // console.warn(users, selectedUser)
  return (
    <>
      {!isUserSelected &&
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Select Your Profile</Text>
            <Text style={styles.subtitle}>Choose your user account for this device</Text>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setPickerVisible(true)}
            >
              {selectedUser ? (
                <View style={styles.selectedUserContainer}>
                  <View style={styles.selectedUserAvatar}>
                    <Text style={styles.selectedAvatarText}>
                      {selectedUser.name[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.selectedUserInfo}>
                    <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                    <Text style={styles.selectedUserPhone}>{selectedUser.phone}</Text>
                  </View>
                  <Icon name="arrow-drop-down" size={24} color="#075e54" />
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select a user</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                !selectedUser && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!selectedUser}
            >
              <Text style={styles.submitButtonText}>Continue</Text>
            </TouchableOpacity>


            <Modal
              visible={isPickerVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setPickerVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select User</Text>
                    <TouchableOpacity
                      onPress={() => setPickerVisible(false)}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id.toString()}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    contentContainerStyle={styles.listContent}
                  />
                </View>
              </View>
            </Modal>
          </View>
        </SafeAreaView>
      }
      {isUserSelected &&
        <HomeScreen
          channelName={channelName}
          setChannelName={setChannelName}
          agoraEngineRef={agoraEngineRef}
          startCall={startCall}
          startVideoCall={startVideoCall}
          joinCall={joinCall}
          isCalling={isCalling}
          users={filteredUser}
          selectedUser={selectedUser}
        />}
    </>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#075e54',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#075e54',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#075e54',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedUserInfo: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  selectedUserPhone: {
    fontSize: 14,
    color: '#666',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#075e54',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  selectedUserItem: {
    backgroundColor: '#e8f5e9',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#075e54',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
  },
});