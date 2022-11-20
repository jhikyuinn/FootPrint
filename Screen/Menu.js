import React, {useEffect,useState} from 'react';
import {Platform, View ,StyleSheet} from 'react-native';
import 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Ready from './Ready';
import Notification from './Notification';
import User from './User';

function Menu({route,navigation}){
    const {alias}=route.params
    const {pair}=route.params
    const {password}=route.params
    const Tab = createBottomTabNavigator();

    return(
    <>
    <Tab.Navigator initialRouteName="Ready" screenOptions={({route }) => ({
        headerShown: false,
        tabBarActiveTintColor:"green",
        tabBarInActiveTintColor:"green",
        tabBarStyle:{
            height: 60,
            backgroundColor:'#6c7bb8',
            showLabel:false
        },
        tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Ready') {
                iconName ='chatbubble-ellipses-outline';
                color="black"
                size=30
            } else if (route.name === 'Notification') {
                iconName ='notifications-outline';
                color="black"
                size=30
            }
            else if (route.name === 'User') {
                iconName = 'person-circle-outline';
                color="black"
                size=30
            }
        return <Ionicons name={iconName} size={size} color={color} />
        }}
    )}>

        <Tab.Screen 
            name="Notification" 
            options={{tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: "bold",
                color:"black"
                }
            }} 
            children={({navigation})=><Notification alias={alias} password={password} pair={pair} navigation={navigation}/>} 
        />
        <Tab.Screen 
            name="Ready" 
            options={{tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "bold",
            color:"black"
            }
            }} 
            children={({navigation})=><Ready alias={alias} password={password} pair={pair} navigation={navigation}/>} 
        />
        <Tab.Screen 
            name="User" 
            options={{tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "bold",
            color:"black"
            }
        }} 
        children={({navigation})=><User alias={alias} password={password} pair={pair}  navigation={navigation}/>} 
        />
    </Tab.Navigator>
    </>
    );
}

export default Menu;
