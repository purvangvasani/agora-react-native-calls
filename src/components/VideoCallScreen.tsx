import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  RtcSurfaceView,
  RenderModeType,
  IRtcEngine,
} from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface VideoCallScreenProps {
  currentContact: {
    id: number;
    name: string;
    phone: string;
  } | null;
  joinedUsers: number[];
  onEndCall: () => void;
  channelName: string;
  speakingUsers: { [key: number]: number };
  agoraEngineRef: React.RefObject<IRtcEngine>;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  currentContact,
  joinedUsers,
  onEndCall,
  channelName,
  speakingUsers,
  agoraEngineRef,
}) => {
  useEffect(() => {
    // Enable video when component mounts
    agoraEngineRef.current?.enableVideo();
    return () => {
      // Disable video when component unmounts
      agoraEngineRef.current?.disableVideo();
    };
  }, []);

  const renderParticipantVideo = (uid: number) => (
    <View key={uid} style={styles.remoteVideo}>
      <RtcSurfaceView
        canvas={{
          uid,
          renderMode: 1,
        }}
        style={styles.videoView}
      />
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {uid === currentContact?.id ? currentContact.name : `Participant ${uid}`}
        </Text>
        {speakingUsers[uid] > 0 && <View style={styles.speakingIndicator} />}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {currentContact ? currentContact.name : channelName}
        </Text>
        <Text style={styles.subHeaderText}>
          {joinedUsers.length} participant{joinedUsers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.videoContainer}>
        {/* Local video */}
        <View style={styles.localVideo}>
          <RtcSurfaceView
            canvas={{ uid: 0 }}
            style={styles.videoView}
          />
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>You</Text>
            {speakingUsers[0] > 0 && <View style={styles.speakingIndicator} />}
          </View>
        </View>

        {/* Remote videos */}
        <View style={styles.remoteVideos}>
          {joinedUsers.map(renderParticipantVideo)}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={onEndCall}
        >
          <Icon name="call-end" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 60,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 4,
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  localVideo: {
    width: Dimensions.get('window').width,
    height: 200,
    backgroundColor: '#2c2c2c',
  },
  remoteVideos: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  remoteVideo: {
    width: '50%',
    height: 200,
    backgroundColor: '#2c2c2c',
  },
  videoView: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
  },
  participantName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  speakingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
});

export default VideoCallScreen; 