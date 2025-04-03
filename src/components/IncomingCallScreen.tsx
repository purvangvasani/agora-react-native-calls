import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Contact } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { RouteProp } from '@react-navigation/native';

type IncomingCallScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'IncomingCall'>;
type IncomingCallScreenRouteProp = RouteProp<RootStackParamList, 'IncomingCall'>;

interface IncomingCallScreenProps {
    navigation: IncomingCallScreenNavigationProp;
    route: IncomingCallScreenRouteProp;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({ navigation, route }) => {
    const { caller, channelName, currentUser, agoraEngineRef } = route.params;
    const handleAcceptCall = () => {
        // Enable audio for the call
        agoraEngineRef.current?.enableAudio();
        agoraEngineRef.current?.enableLocalAudio(true);
        agoraEngineRef.current?.muteLocalAudioStream(false);
        agoraEngineRef.current?.muteAllRemoteAudioStreams(false);

        // Navigate to the Call screen
        navigation.navigate('Call', {
            currentContact: currentUser,
            channelName,
            currentUser,
            agoraEngineRef,
        });
    };
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Incoming Call</Text>
            <View style={styles.callerInfo}>
                <Text style={styles.callerName}>{caller?.name}</Text>
                <Text style={styles.callerPhone}>{caller?.number}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.declineButton} onPress={() => navigation.goBack()}>
                    <Icon name="call-end" size={32} color="#fff" />
                    <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptCall}>
                    <Icon name="call" size={32} color="#fff" />
                    <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#075e54',
    },
    title: {
        fontSize: 24,
        color: '#fff',
        marginBottom: 20,
    },
    callerInfo: {
        alignItems: 'center',
        marginBottom: 40,
    },
    callerName: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
    },
    callerPhone: {
        fontSize: 16,
        color: '#fff',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
    },
    declineButton: {
        backgroundColor: '#d32f2f',
        padding: 20,
        borderRadius: 50,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        padding: 20,
        borderRadius: 50,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        marginTop: 8,
        fontSize: 16,
    },
});

export default IncomingCallScreen;