import * as React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Menu from './Screen/Menu';
import Main from './Screen/Main';
import Chat from './Screen/Chat';

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
                    component={Menu} 
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
                <Stack.Screen name="Chat" component={Chat} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default App;

