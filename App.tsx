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

// Replace process.env variables with direct values
const APP_ID = '9ea47ffa5d624be09aa43318b934a590';
const APP_TOKEN = '007eJxTYFg+V7ci/pjxMzvH/plpBZr3dl9+XlhfKVOxUL795eo5khkKDJapiSbmaWmJpilmRiZJqQaWiYkmxsaGFkmWxiaJppYGM1VfpTcEMjK0rZvCxMgAgSA+O0NJanFJZl46AwMA7Aghng==';
const DEFAULT_CHANNEL_NAME = 'testing';

const App: React.FC = () => {
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [userJoined, setUserJoined] = useState<boolean>(false);
  const [joinedUsers, setJoinedUsers] = useState<number[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<{ [key: number]: number }>({});
  const agoraEngineRef = useRef<IRtcEngine>(null!);
  const [channelName, setChannelName] = useState<string>(DEFAULT_CHANNEL_NAME);
  const [isVideoCall, setIsVideoCall] = useState<boolean>(false);

  useEffect(() => {
    if (!APP_ID) {
      console.error('Agora App ID is missing!');
      return;
    }
    setupVoiceSDKEngine();
    return () => {
      if (agoraEngineRef.current) {
        agoraEngineRef.current.release();
      }
    };
  }, []);

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
        setCurrentContact(contact);
        
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

  const startCall = async (contact: Contact): Promise<void> => {
    try {
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

  return (
    <HomeScreen
      channelName={channelName}
      setChannelName={setChannelName}
      agoraEngineRef={agoraEngineRef}
      startCall={startCall}
      startVideoCall={startVideoCall}
      joinCall={joinCall}
      isCalling={isCalling}
    />
  );
};

export default App;