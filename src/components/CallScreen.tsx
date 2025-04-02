import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Animated,
    StatusBar,
} from 'react-native';
import { IRtcEngine } from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Contact } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type CallScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Call'>;
type CallScreenRouteProp = RouteProp<RootStackParamList, 'Call'>;

interface CallScreenProps {
    navigation: CallScreenNavigationProp;
    route: CallScreenRouteProp;
}

const CallScreen: React.FC<CallScreenProps> = ({ navigation, route }) => {
    const { currentContact, channelName, currentUser, agoraEngineRef } = route.params;
    const [duration, setDuration] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        StatusBar.setBarStyle('light-content');
        const timer = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);

        // Start pulse animation for speaking indicator
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        return () => {
            clearInterval(timer);
            StatusBar.setBarStyle('default');
            handleEndCall();
        };
    }, []);

    const handleEndCall = async () => {
        try {
            // Make API call to log call end
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

            // Clean up Agora engine
            const agoraEngine = agoraEngineRef.current;
            if (agoraEngine) {
                await agoraEngine.leaveChannel();
            }

            // Navigate back
            navigation.goBack();
        } catch (err) {
            console.error('Error ending call:', err);
            navigation.goBack(); // Still navigate back even if API call fails
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

    const toggleSpeaker = () => {
        if (agoraEngineRef.current) {
            setIsSpeakerOn(!isSpeakerOn);
            agoraEngineRef.current.setEnableSpeakerphone(!isSpeakerOn);
        }
    };

    const renderParticipant = (uid: number) => (
        <View key={uid} style={styles.participantItem}>
            <View style={styles.participantAvatar}>
                <Text style={styles.avatarText}>
                    {(uid === currentContact?.id ? currentContact.name : `User ${uid}`).charAt(0)}
                </Text>
                {/* {speakingUsers[uid] > 0 && (
                    <Animated.View
                        style={[
                            styles.speakingRing,
                            { transform: [{ scale: pulseAnim }] }
                        ]}
                    />
                )} */}
            </View>
            <Text style={styles.participantName}>
                {uid === currentContact?.id ? currentContact.name : `User ${uid}`}
            </Text>
            {/* {speakingUsers[uid] > 0 && <View style={styles.speakingIndicator} />} */}
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

            <View style={styles.content}>
                <View style={styles.mainParticipant}>
                    <View style={styles.mainAvatar}>
                        <Text style={styles.mainAvatarText}>
                            {currentContact?.name?.charAt(0) || channelName.charAt(0)}
                        </Text>
                        {/* {speakingUsers[currentContact?.id || 0] > 0 && (
                            <Animated.View
                                style={[
                                    styles.mainSpeakingRing,
                                    { transform: [{ scale: pulseAnim }] }
                                ]}
                            />
                        )} */}
                    </View>
                    <Text style={styles.mainName}>
                        {currentContact?.name || channelName}
                    </Text>
                </View>

                {/* <View style={styles.participantsList}>
                    {joinedUsers.map(renderParticipant)}
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
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
    },
    mainParticipant: {
        alignItems: 'center',
        marginBottom: 40,
    },
    mainAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#075e54',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    mainAvatarText: {
        fontSize: 48,
        color: '#fff',
        fontWeight: 'bold',
    },
    mainName: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    mainSpeakingRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 64,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    participantsList: {
        width: '100%',
        paddingHorizontal: 16,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        marginBottom: 8,
    },
    participantAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#075e54',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    participantName: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
    },
    speakingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginLeft: 8,
    },
    speakingRing: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#4CAF50',
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
});

export default CallScreen; 