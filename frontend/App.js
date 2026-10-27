import * as React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Menu from './Screen/Menu';
import Main from './Screen/Main';
import Chat from './Screen/Chat';
import CryptoBridge from './lib/cryptoBridge';
import { withSession } from './lib/session';

// created once: wrapping inside App would remount the screens on every render
const MenuScreen = withSession(Menu);
const ChatScreen = withSession(Chat);

const Stack = createStackNavigator();

function App() {
    return (
        <>
        {/* SEA's crypto on mobile runs in this hidden WebView: it lives as long as the app,
            since a screen that holds it (Main) is dropped after login and every crypto call would hang (#60).
            Web uses the browser's own crypto. */}
        {Platform.OS !== 'web' && <CryptoBridge />}
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    // on web the stack otherwise grows each screen to its content and scrolls the page,
                    // so lists inside a screen (the chat messages) never scroll and push the input off screen
                    cardStyle: { flex: 1 },
                    animation: Platform.select({
                    ios: 'default',
                    android: 'none',
                })
            }}>
                <Stack.Screen name="Main" component={Main} />
                <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Ready' }}/>
                <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
        </NavigationContainer>
        </>
    );
}

export default App;

