import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Menu from './Screen/Menu';
import Main from './Screen/Main';
import Chat from './Screen/Chat';

function App() {
    const Stack = createStackNavigator();

    return (
        <NavigationContainer>
            <Stack.Navigator 
                screenOptions={{ 
                    headerShown: false, 
                    animationEnabled: Platform.select({
                    ios: true,
                    android: false,
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

