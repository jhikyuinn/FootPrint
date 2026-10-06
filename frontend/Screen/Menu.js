import React, {useEffect,useState} from 'react';
import {Platform, View ,StyleSheet} from 'react-native';
import 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import Ready from './Ready';
import Notification from './Notification';
import User from './User';
import { colors } from '../lib/styles';

// created once: a navigator created during render remounts every tab on each render
const Tab = createBottomTabNavigator();

function Menu({route,navigation}){
    const {alias}=route.params
    const {pair}=route.params
    const {password}=route.params

    return(
    <>
    <Tab.Navigator initialRouteName="Ready" screenOptions={({route }) => ({
        headerShown: false,
        tabBarActiveTintColor:"green",
        tabBarInactiveTintColor:"green",
        tabBarStyle:{
            tabBarLabel: () => null,
            height: 60,
            backgroundColor:colors.background,
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ activecolor, color, size,focused }) => {
            let iconName;
            if (route.name === 'Ready') {
                iconName ='chatbubble-ellipses-outline';
                color='black'
                activecolor='white'
                size=30
            } else if (route.name === 'Notification') {
                iconName ='notifications-outline';
                color="black"
                activecolor='white'
                size=30
            }
            else if (route.name === 'User') {
                iconName = 'person-circle-outline';
                color="black"
                activecolor='white'
                size=30
            }
        return <Ionicons name={iconName} size={size} color={focused ? activecolor:color} />
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
