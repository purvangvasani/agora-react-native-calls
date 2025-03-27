import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    Animated,
} from 'react-native';
import { IRtcEngine } from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface CallScreenProps {
    currentContact?: {
        name: string;
        phone: string;
    } | null;
    joinedUsers: number[];
    onEndCall: () => void;
    channelName: string;
    speakingUsers: { [key: number]: number };
    agoraEngineRef: React.RefObject<IRtcEngine>;
}

const CallScreen: React.FC<CallScreenProps> = ({
    currentContact,
    joinedUsers,
    onEndCall,
    channelName,
    speakingUsers,
    agoraEngineRef
}) => {
    // In CallScreen.tsx
    useEffect(() => {
        const agoraEngine = agoraEngineRef.current;
        if (agoraEngine) {
            agoraEngine.muteLocalAudioStream(false);
            agoraEngine.muteAllRemoteAudioStreams(false);
            agoraEngine.setEnableSpeakerphone(true);
        }
    }, []);

    const getVolumeIndicatorStyle = (volume: number) => {
        // Convert volume (0-255) to opacity (0.2-1)
        const opacity = 0.2 + (volume / 255) * 0.8;
        return {
            ...styles.speakingIndicator,
            opacity,
        };
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Call Status */}
                <View style={styles.statusContainer}>
                    <Icon name="phone-in-talk" size={40} color="#4CAF50" />
                    <Text style={styles.statusText}>
                        {!currentContact ? 'On Call' : 'Connected'}
                    </Text>
                    <Text style={styles.channelText}>Channel: {channelName}</Text>
                </View>

                {/* Contact Info */}
                <View style={styles.contactContainer}>
                    <View style={styles.avatarContainer}>
                        <Icon name="account-circle" size={100} color="#666" />
                        {speakingUsers[joinedUsers[0]] > 0 && (
                            <View style={getVolumeIndicatorStyle(speakingUsers[joinedUsers[0]])} />
                        )}
                    </View>
                    {currentContact ? (
                        <>
                            <Text style={styles.nameText}>{currentContact.name}</Text>
                            <Text style={styles.phoneText}>{currentContact.phone}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.nameText}>Group Call</Text>
                            <Text style={styles.participantsText}>
                                {joinedUsers.length} participant{joinedUsers.length !== 1 ? 's' : ''}
                            </Text>
                            <View style={styles.participantsContainer}>
                                {joinedUsers.map((uid) => (
                                    <View key={uid} style={styles.participantItem}>
                                        <Icon name="person" size={24} color="#666" />
                                        {speakingUsers[uid] > 0 && (
                                            <View style={getVolumeIndicatorStyle(speakingUsers[uid])} />
                                        )}
                                        <Text style={styles.participantText}>User {uid}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {/* Call Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        style={styles.endCallButton}
                        onPress={onEndCall}
                        activeOpacity={0.7}
                    >
                        <Icon name="call-end" size={36} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
    },
    statusContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    statusText: {
        fontSize: 18,
        color: '#4CAF50',
        marginTop: 10,
        fontWeight: '600',
    },
    channelText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    contactContainer: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#e1e2e3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    phoneText: {
        fontSize: 16,
        color: '#666',
    },
    participantsText: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    participantsContainer: {
        marginTop: 20,
        width: '100%',
        paddingHorizontal: 20,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
        position: 'relative',
    },
    participantText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    endCallButton: {
        backgroundColor: '#ff4444',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    speakingIndicator: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff',
    },
});

export default CallScreen; 