import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SelectUserScreen from '../screens/SelectUserScreen';
import HomeScreen from '../screens/HomeScreen';
import CallScreen from '../components/CallScreen';
import VideoCallScreen from '../components/VideoCallScreen';
import { Contact } from '../types';
import { IRtcEngine } from 'react-native-agora';
import IncomingCallScreen from '../components/IncomingCallScreen';

export type RootStackParamList = {
    SelectUser: undefined;
    Home: {
        currentUser: Contact;
        agoraEngineRef: React.RefObject<IRtcEngine>;
    };
    Call: {
        currentContact: Contact;
        channelName: string;
        currentUser: Contact;
        agoraEngineRef: React.RefObject<IRtcEngine>;
    };
    VideoCall: {
        currentContact: Contact;
        channelName: string;
        currentUser: Contact;
        agoraEngineRef: React.RefObject<IRtcEngine>;
    };
    IncomingCall: {
        caller: Contact;
        channelName: string;
        currentUser: Contact;
        agoraEngineRef: React.RefObject<IRtcEngine>;
        isVoiceCall: boolean;
        isVideoCall: boolean;
    };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="SelectUser"
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen
                    name="SelectUser"
                    component={SelectUserScreen}
                />
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{
                        headerShown: true,
                        headerBackVisible: false,
                        headerStyle: {
                            backgroundColor: '#075e54',
                        },
                        headerTintColor: '#fff',
                    }}
                />
                <Stack.Screen
                    name="Call"
                    component={CallScreen}
                />
                <Stack.Screen
                    name="VideoCall"
                    component={VideoCallScreen}
                />
                <Stack.Screen
                    name="IncomingCall"
                    component={IncomingCallScreen}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator; 