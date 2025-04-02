import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  RtcSurfaceView,
  RenderModeType,
  IRtcEngine,
} from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Contact } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type VideoCallScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VideoCall'>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCall'>;

interface VideoCallScreenProps {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({ navigation, route }) => {
  const { currentContact, channelName, currentUser, agoraEngineRef } = route.params;
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    agoraEngineRef.current?.enableVideo();
    
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => {
      agoraEngineRef.current?.disableVideo();
      clearInterval(timer);
      StatusBar.setBarStyle('default');
      handleEndCall();
    };
  }, []);

  const handleEndCall = async () => {
    try {
      await fetch('http://localhost:3000/api/calls/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: currentContact.id,
          channelName,
          isVoiceCall: false,
          isVideoCall: false,
          endTime: new Date().toISOString(),
          callerId: currentUser.id,
        }),
      });

      const agoraEngine = agoraEngineRef.current;
      if (agoraEngine) {
        agoraEngine.stopPreview();
        agoraEngine.disableVideo();
        await agoraEngine.leaveChannel();
      }

      navigation.goBack();
    } catch (err) {
      console.error('Error ending video call:', err);
      navigation.goBack();
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (agoraEngineRef.current) {
      setIsMuted(!isMuted);
      agoraEngineRef.current.muteLocalAudioStream(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (agoraEngineRef.current) {
      setIsCameraOff(!isCameraOff);
      agoraEngineRef.current.enableLocalVideo(isCameraOff);
    }
  };

  const toggleSpeaker = () => {
    if (agoraEngineRef.current) {
      setIsSpeakerOn(!isSpeakerOn);
      agoraEngineRef.current.setEnableSpeakerphone(!isSpeakerOn);
    }
  };

  const renderParticipantVideo = (uid: number) => (
    <View key={uid} style={styles.remoteVideo}>
      <RtcSurfaceView
        canvas={{
          uid,
          renderMode: RenderModeType.RenderModeFit,
        }}
        style={styles.videoView}
      />
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {uid === currentContact?.id ? currentContact.name : `Participant ${uid}`}
        </Text>
        {/* {speakingUsers[uid] > 0 && <View style={styles.speakingIndicator} />} */}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.callInfo}>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          <Text style={styles.channelName}>{channelName}</Text>
        </View>
        {/* <View style={styles.participantCount}>
          <Icon name="people" size={20} color="#fff" />
          <Text style={styles.participantCountText}>{joinedUsers.length + 1}</Text>
        </View> */}
      </View>

      <View style={styles.videoContainer}>
        {/* Main video - Show local video when alone, otherwise show remote video */}
        <View style={styles.mainVideo}>
          {/* <RtcSurfaceView
            canvas={{ uid: joinedUsers.length > 0 ? joinedUsers[0] : 0 }}
            style={styles.videoView}
          />
          {joinedUsers.length > 0 && (
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {joinedUsers[0] === currentContact?.id ? currentContact.name : `Participant ${joinedUsers[0]}`}
              </Text>
            </View>
          )} */}
        </View>

        {/* Picture-in-picture video */}
        {/* {joinedUsers.length > 0 && (
          <View style={styles.pipVideo}>
            <RtcSurfaceView
              canvas={{ uid: 0 }}
              style={styles.videoView}
            />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>You</Text>
            </View>
          </View>
        )} */}

        {/* Additional participants */}
        {/* <View style={styles.additionalVideos}>
          {joinedUsers.slice(1).map(renderParticipantVideo)}
        </View> */}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Icon name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
          onPress={toggleCamera}
        >
          <Icon name={isCameraOff ? "videocam-off" : "videocam"} size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Icon name="call-end" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          <Icon name={isSpeakerOn ? "volume-up" : "volume-off"} size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {}}
        >
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callInfo: {
    flexDirection: 'column',
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  channelName: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
  participantCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 16,
  },
  participantCountText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    flex: 1,
  },
  pipVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  additionalVideos: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    padding: 8,
  },
  remoteVideo: {
    width: 120,
    height: 90,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fff',
  },
  videoView: {
    flex: 1,
  },
  participantInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  participantName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: '#d32f2f',
  },
  endCallButton: {
    backgroundColor: '#ff4444',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  speakingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 4,
  },
});

export default VideoCallScreen; 