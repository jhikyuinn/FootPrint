import React from 'react';
import {View, StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../lib/styles';

// A speech bubble with footsteps in it, and a red seal for the ledger record.
const Logo = ({size = 84}) => {
    const seal = size * 0.36;
    return (
        <View style={{width:size, height:size * 1.1}}>
            <View style={[styles.tail, {width:size * 0.3, height:size * 0.3, left:size * 0.14, top:size * 0.72}]} />
            <View style={[styles.bubble, {width:size, height:size, borderRadius:size * 0.26}]}>
                <Ionicons name="footsteps" size={size * 0.52} color={colors.background} />
            </View>
            <View style={[styles.seal, {width:seal, height:seal, borderRadius:seal / 2, right:-seal * 0.25, top:-seal * 0.25}]}>
                <Ionicons name="checkmark" size={seal * 0.6} color="white" />
            </View>
        </View>
    );
};

export default Logo;

const styles = StyleSheet.create({
    bubble:{
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    tail:{
        position: "absolute",
        backgroundColor: colors.primary,
        transform: [{rotate: "45deg"}],
    },
    seal:{
        position: "absolute",
        backgroundColor: colors.accent,
        borderWidth: 2,
        borderColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
    },
});
