import React from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
const DesignButton = (props)=>{
    if(props.outline == true){
        return (
        <TouchableOpacity onPress={props.buttonFunction} style={{width:props.width,height:props.height,borderWidth:1,borderColor:props.bgcolor,borderRadius:10,marginTop:10,marginRight:10,justifyContent:'center',alignItems:'center'}}>
            <Text style={{color:props.color, fontSize:props.fontSize}}>{props.text}</Text>
        </TouchableOpacity>
        )
    }else{
        return (
            <TouchableOpacity onPress={props.buttonFunction} style={{width:props.width,height:props.height,backgroundColor:props.bgcolor,borderRadius:10,marginTop:10,marginRight:10,justifyContent:'center',alignItems:'center'}}>
                <Text style={{color:props.color, fontSize:props.fontSize}}>{props.text}</Text>
            </TouchableOpacity>
        )
    }

}
export default DesignButton;