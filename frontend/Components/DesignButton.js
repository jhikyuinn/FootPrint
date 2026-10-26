import React from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
const DesignButton = (props)=>{
    const opacity = props.disabled ? 0.5 : 1;
    if(props.outline == true){
        return (
        <TouchableOpacity disabled={props.disabled} onPress={props.buttonFunction} style={{width:props.width,height:props.height,borderWidth:1.5,borderColor:props.bgcolor,borderRadius:8,marginTop:12,justifyContent:'center',alignItems:'center',opacity}}>
            <Text style={{color:props.color, fontSize:props.fontSize || 16, fontWeight:'600'}}>{props.text}</Text>
        </TouchableOpacity>
        )
    }else{
        return (
            <TouchableOpacity disabled={props.disabled} onPress={props.buttonFunction} style={{width:props.width,height:props.height,backgroundColor:props.bgcolor,borderRadius:8,marginTop:12,justifyContent:'center',alignItems:'center',opacity}}>
                <Text style={{color:props.color, fontSize:props.fontSize || 16, fontWeight:'600'}}>{props.text}</Text>
            </TouchableOpacity>
        )
    }

}
export default DesignButton;
