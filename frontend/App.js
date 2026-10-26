import * as React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Menu from './Screen/Menu';
import Main from './Screen/Main';
import Chat from './Screen/Chat';
import { withSession } from './lib/session';

// created once: wrapping inside App would remount the screens on every render
const MenuScreen = withSession(Menu);
const ChatScreen = withSession(Chat);

const Stack = createStackNavigator();

function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: Platform.select({
                    ios: 'default',
                    android: 'none',
                })
            }}>
                <Stack.Screen name="Main" component={Main} />
                <Stack.Screen 
                    name="Menu" 
                    component={MenuScreen} 
                    options={{
                        title: 'Ready',
                        headerStyle: {
                        backgroundColor: '#f4511e',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                        fontWeight: 'bold',
                        },
                    }}/>
                <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default App;

